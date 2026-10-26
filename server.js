import express from "express";
import { createReadStream } from "node:fs";
import { readdir, stat } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";

const app = express();
const PORT = Number(process.env.PORT ?? 3000);
const MOVIE_DIR = path.resolve(
  process.env.MOVIE_DIR ?? path.join(os.homedir(), "Downloads", "Movies")
);
const PUBLIC_DIR = fileURLToPath(new URL("./public/", import.meta.url));

const VIDEO_CONTENT_TYPES = new Map([
  [".avi", "video/x-msvideo"],
  [".m4v", "video/mp4"],
  [".mkv", "video/x-matroska"],
  [".mov", "video/quicktime"],
  [".mp4", "video/mp4"],
  [".webm", "video/webm"]
]);
const VIDEO_EXTENSIONS = new Set(VIDEO_CONTENT_TYPES.keys());

app.use(express.static(PUBLIC_DIR));

app.get("/api/movies", async (_req, res) => {
  let files;

  try {
    files = await readdir(MOVIE_DIR, { withFileTypes: true });
  } catch (error) {
    console.error(`Could not read movie folder "${MOVIE_DIR}":`, error);
    return res.status(500).json({
      error: "Could not read the Movies folder. Check that the folder exists."
    });
  }

  const movies = files
    .filter(
      (file) =>
        file.isFile() &&
        VIDEO_EXTENSIONS.has(path.extname(file.name).toLowerCase())
    )
    .map((file) => ({
      name: file.name,
      title: path.basename(file.name, path.extname(file.name)),
      url: `/stream/${encodeURIComponent(file.name)}`
    }))
    .sort((a, b) => a.title.localeCompare(b.title));

  res.json(movies);
});

app.get("/stream/:filename", async (req, res) => {
  const { filename } = req.params;

  if (
    !filename ||
    filename !== path.basename(filename) ||
    !VIDEO_EXTENSIONS.has(path.extname(filename).toLowerCase())
  ) {
    return res.status(400).send("Invalid video filename");
  }

  const filePath = path.join(MOVIE_DIR, filename);
  let fileInfo;

  try {
    fileInfo = await stat(filePath);
  } catch (error) {
    if (error.code === "ENOENT" || error.code === "ENOTDIR") {
      return res.status(404).send("Movie not found");
    }

    console.error(`Could not access movie "${filePath}":`, error);
    return res.status(500).send("Could not access movie");
  }

  if (!fileInfo.isFile()) {
    return res.status(404).send("Movie not found");
  }

  const contentType =
    VIDEO_CONTENT_TYPES.get(path.extname(filename).toLowerCase()) ??
    "application/octet-stream";
  const range = req.headers.range;

  res.setHeader("Content-Type", contentType);
  res.setHeader("Accept-Ranges", "bytes");

  let start = 0;
  let end = fileInfo.size - 1;

  if (range) {
    const match = /^bytes=(\d*)-(\d*)$/.exec(range);

    if (!match || (!match[1] && !match[2])) {
      res.setHeader("Content-Range", `bytes */${fileInfo.size}`);
      return res.status(416).end();
    }

    if (!match[1]) {
      const suffixLength = Number(match[2]);
      if (
        !Number.isSafeInteger(suffixLength) ||
        suffixLength <= 0 ||
        fileInfo.size === 0
      ) {
        res.setHeader("Content-Range", `bytes */${fileInfo.size}`);
        return res.status(416).end();
      }
      start = Math.max(0, fileInfo.size - suffixLength);
    } else {
      start = Number(match[1]);
      end = match[2] ? Number(match[2]) : fileInfo.size - 1;
    }

    if (
      !Number.isSafeInteger(start) ||
      !Number.isSafeInteger(end) ||
      start >= fileInfo.size ||
      end < start
    ) {
      res.setHeader("Content-Range", `bytes */${fileInfo.size}`);
      return res.status(416).end();
    }

    end = Math.min(end, fileInfo.size - 1);
    res.writeHead(206, {
      "Content-Range": `bytes ${start}-${end}/${fileInfo.size}`,
      "Content-Length": end - start + 1
    });
  } else {
    res.setHeader("Content-Length", fileInfo.size);
  }

  if (fileInfo.size === 0) {
    return res.end();
  }

  const stream = createReadStream(filePath, { start, end });
  stream.on("error", (error) => {
    console.error(`Could not stream movie "${filePath}":`, error);
    if (!res.headersSent) {
      res.status(500).end("Could not stream movie");
    } else {
      res.destroy(error);
    }
  });
  stream.pipe(res);
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Movie server running on port ${PORT}`);
  console.log(`Movies folder: ${MOVIE_DIR}`);
  console.log(`Open http://localhost:${PORT} on this PC`);
});
