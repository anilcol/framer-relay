import express from "express";
import { connect } from "framer-api";

const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 3000;
const FRAMER_API_KEY = process.env.FRAMER_API_KEY;
const FRAMER_PROJECT_URL = process.env.FRAMER_PROJECT_URL; // e.g. https://framer.com/projects/<id>
const FRAMER_COLLECTION_NAME = process.env.FRAMER_COLLECTION_NAME || "Blog"; // name of the CMS collection, e.g. "Blog" / "News"
const RELAY_SHARED_SECRET = process.env.RELAY_SHARED_SECRET; // shared secret n8n must send

function slugify(input) {
  return input
    .toString()
    .toLowerCase()
    .trim()
    .replace(/ä/g, "ae").replace(/ö/g, "oe").replace(/ü/g, "ue").replace(/ß/g, "ss")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

// Simple shared-secret auth so only your n8n workflow can call this endpoint.
app.use((req, res, next) => {
  if (req.path === "/health") return next();
  const provided = req.header("x-relay-secret");
  if (!RELAY_SHARED_SECRET || provided !== RELAY_SHARED_SECRET) {
    return res.status(401).json({ error: "Unauthorized" });
  }
  next();
});

app.get("/health", (_req, res) => res.json({ ok: true }));

// Body: { title, body, metaDescription?, sourcesMarkdown?, slug? }
app.post("/publish-article", async (req, res) => {
  const { title, body, metaDescription, sourcesMarkdown, slug } = req.body || {};

  if (!title || !body) {
    return res.status(400).json({ error: "title and body are required" });
  }

  let framer;
  try {
    framer = await connect(FRAMER_PROJECT_URL, FRAMER_API_KEY);

    const collections = await framer.getCollections();
    const collection = collections.find(
      (c) => c.name?.toLowerCase() === FRAMER_COLLECTION_NAME.toLowerCase()
    );

    if (!collection) {
      const names = collections.map((c) => c.name).join(", ");
      return res.status(404).json({
        error: `Collection "${FRAMER_COLLECTION_NAME}" not found. Available: ${names}`
      });
    }

    const fields = await collection.getFields();

    const findField = (candidates) =>
      fields.find((f) => candidates.some((c) => f.name?.toLowerCase() === c.toLowerCase()));

    const titleField = findField(["title"]);
    const contentField = findField(["content", "body", "text", "article"]);
    const metaField = findField(["meta description", "metadescription", "excerpt", "summary"]);
    const sourcesField = findField(["sources", "quellen"]);
    const dateField = findField(["published date", "date", "veröffentlicht"]);

    if (!titleField || !contentField) {
      return res.status(500).json({
        error: "Could not find a Title and/or Content field on the collection. Check field names in Framer.",
        availableFields: fields.map((f) => ({ id: f.id, name: f.name, type: f.type }))
      });
    }

    const fieldData = {
      [titleField.id]: { value: title },
      [contentField.id]: { value: body, contentType: "markdown" }
    };

    if (metaField && metaDescription) {
      fieldData[metaField.id] = { value: metaDescription };
    }
    if (sourcesField && sourcesMarkdown) {
      fieldData[sourcesField.id] = { value: sourcesMarkdown, contentType: "markdown" };
    }
    if (dateField) {
      fieldData[dateField.id] = { value: new Date().toISOString() };
    }

    const itemSlug = slug ? slugify(slug) : slugify(title);
    const itemId = itemSlug; // stable id derived from slug, so re-runs update rather than duplicate

    await collection.addItems([
      {
        id: itemId,
        slug: itemSlug,
        fieldData
      }
    ]);

    const publishResult = await framer.publish();
    await framer.deploy(publishResult.deployment.id);

    res.json({
      ok: true,
      slug: itemSlug,
      deploymentId: publishResult.deployment.id
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err?.message || "Unknown error" });
  } finally {
    if (framer) {
      try {
        await framer.disconnect();
      } catch (_) {}
    }
  }
});

app.listen(PORT, () => {
  console.log(`Framer relay listening on port ${PORT}`);
});
