const express = require("express");
const https = require("https");
const fs = require("fs");
const path = require("path");
const app = express();
const port = 4000;

const bucketName = "bulkpe-colloction";
const downloadedFilesDir = "downloaded_files";

// Create the downloaded_files directory if it doesn't exist
if (!fs.existsSync(downloadedFilesDir)) {
  fs.mkdirSync(downloadedFilesDir);
}

// Allow cross-origin requests
app.use((req, res, next) => {
  res.setHeader("Access-Control-Allow-Origin", "*");
  res.setHeader("Access-Control-Allow-Methods", "GET");
  next();
});

app.get("/project/:id", async (req, res) => {
  const projectId = req.params.id;
  const projectKey = `Website${projectId}.html`;
  const filePath = path.join(downloadedFilesDir, projectKey);

  try {
    const fileUrl = await getFileUrlOrDownload(projectKey, filePath);
    res.send(fileUrl);
  } catch (err) {
    res.status(404).send(`Project file with ID ${projectId} not found`);
  }
});

app.get("/template/:id", async (req, res) => {
  const templateId = req.params.id;
  const templateKey = `Bulkpe${templateId}.html`;
  const filePath = path.join(downloadedFilesDir, templateKey);

  try {
    const fileUrl = await getFileUrlOrDownload(templateKey, filePath);
    res.send(fileUrl);
  } catch (err) {
    res.status(404).send(`Template file with ID ${templateId} not found`);
  }
});

app.get("/html-template/:id", async (req, res) => {
  const templateId = req.params.id;
  const templateKey = `Bulkpe${templateId}.html`;
  //   const filePath = path.join(downloadedFilesDir, templateKey);
  const url = `https://${bucketName}.s3.amazonaws.com/Content/${templateKey}`;
  try {
    const fileUrl = await downloadFileFromS3(url);
    res.send(fileUrl);
  } catch (err) {
    res.status(404).send(`Template file with ID ${templateId} not found`);
  }
});

app.delete("/delete-downloads", (req, res) => {
  const downloadedFilesDir = path.join(__dirname, "downloaded_files");

  // Check if the directory exists
  if (fs.existsSync(downloadedFilesDir)) {
    // Remove the directory recursively
    fs.rm(downloadedFilesDir, { recursive: true, force: true }, (err) => {
      if (err) {
        console.error("Error deleting downloaded_files directory:", err);
        return res.status(500).json({ error: "Failed to delete downloads" });
      }

      console.log("downloaded_files directory deleted successfully");
      return res.status(200).json({ message: "Downloads deleted" });
    });
  } else {
    console.log("downloaded_files directory does not exist");
    return res.status(200).json({ message: "No downloads to delete" });
  }
});

const getFileUrlOrDownload = async (key, filePath) => {
  if (fs.existsSync(filePath)) {
    return `https://gold-tiny-termite.cyclic.app/files/${key}`;
  }
  // Download the file from S3
  const url = `https://${bucketName}.s3.amazonaws.com/Content/${key}`;
  const fileData = await downloadFileFromS3(url);

  // Save the file locally
  fs.writeFileSync(filePath, fileData);

  // Return local URL
  return `https://gold-tiny-termite.cyclic.app/files/${key}`;
};

const downloadFileFromS3 = async (url) => {
  return new Promise((resolve, reject) => {
    https
      .get(url, (res) => {
        let data = "";

        res.on("data", (chunk) => {
          data += chunk;
        });

        res.on("end", () => {
          resolve(data);
        });
      })
      .on("error", (err) => {
        reject(err);
      });
  });
};

// Serve downloaded files from the downloaded_files directory
app.use("/files", express.static(downloadedFilesDir));

app.get("/", (req, res) => res.send("Server is live!"));

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
