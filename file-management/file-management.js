(function (Backendless) {
  const APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  const SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";
  let currentUser = null;

  if (!APPLICATION_ID || !SECRET_KEY) {
    alert(
      "Missing application ID or secret key. Please configure Backendless settings."
    );
  }

  Backendless.initApp(APPLICATION_ID, SECRET_KEY);

  initCurrentUser();
  initEventHandlers();

  function initEventHandlers() {
    document
      .getElementById("create-folder-btn")
      ?.addEventListener("click", createFolder);

    document
      .getElementById("delete-item-btn")
      ?.addEventListener("click", deleteItem);

    document
      .getElementById("list-files-btn")
      ?.addEventListener("click", listFiles);

    document
      .getElementById("upload-file-btn")
      ?.addEventListener("click", uploadFile);

    document.addEventListener("DOMContentLoaded", () => {
      fetch("../assets/footer.html")
        .then((response) => response.text())
        .then((html) => {
          document.getElementById("footer").innerHTML = html;

          const logoutButton = document
            .getElementById("footer")
            ?.querySelector(".footer-nav #logout-btn");

          if (logoutButton) {
            logoutButton.addEventListener("click", logout);
          } else {
            console.error("Logout button not found in footer.");
          }
        })
        .catch((error) => console.error("Error loading footer:", error));
    });

    document
      .getElementById("download-file-btn")
      ?.addEventListener("click", downloadFile);

    document
      .getElementById("share-file-btn")
      ?.addEventListener("click", shareFile);

    document
      .getElementById("list-shared-files-btn")
      ?.addEventListener("click", listSharedFiles);
  }

  function initCurrentUser() {
    Backendless.UserService.getCurrentUser()
      .then((user) => {
        if (!user) {
          alert("Please login first");
          return;
        }
        currentUser = user;
      })
      .catch((error) => {
        alert("Error retrieving current user");
        console.error(error);
      });
  }

  function createFolder() {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const folderName = document.getElementById("folder-name").value;
    document.getElementById("folder-name").value = "";
    if (!folderName) {
      showInfo("Please enter a folder name");
      return;
    }

    const path = `/${currentUser.name}/${folderName}`;

    Backendless.Files.createDirectory(path)
      .then(() => {
        showInfo(`Folder "${folderName}" created successfully`);
      })
      .catch(onError);
  }

  function deleteItem() {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const itemName = document.getElementById("item-name").value;
    if (!itemName) {
      showInfo("Please enter an item name");
      return;
    }
    const path = `/${currentUser.name}/${itemName}`;

    Backendless.Files.remove(path)
      .then(() => showInfo("Item deleted successfully"))
      .catch(onError);
  }

  function listFiles() {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const path = `/${currentUser.name}`;

    Backendless.Files.listing(path)
      .then((files) => {
        const fileList = files.map((file) => file.name).join(", ");
        showInfo("Files: " + fileList);
      })
      .catch(onError);
  }

  function uploadFile() {
    if (!currentUser) {
      alert("Please login first");
      return;
    }

    const fileInput = document.getElementById("file-input");
    const file = fileInput.files[0];

    if (!file) {
      alert("No file selected");
      return;
    }

    const path = `/${currentUser.name}/${file.name}`;

    Backendless.Files.upload(file, path, true)
      .then(() => showInfo("File uploaded successfully"))
      .catch((error) => {
        uploadFileError("File upload fail", file.name, path, currentUser.name);
      });
  }

  function uploadFileError(logger, fileName, path, username) {
    showInfo("File upload fail");
    Backendless.Logging.getLogger(logger).error(
      `Failed to upload file '${fileName}' to path '${path}' by user '${username}'.`
    );
  }

  function downloadFile() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          alert("Please login first");
          return;
        }

        const filePath = document.getElementById("file-name").value;

        if (!filePath) {
          showInfo("Please specify the file path");
          return;
        }

        const fullPath = `${currentUser.name}/${filePath}`;

        const baseFileURL = Backendless.appPath + "/files/";
        const fileURL = baseFileURL + fullPath;

        fetch(fileURL)
          .then((response) => {
            if (!response.ok) {
              throw new Error(`HTTP error! status: ${response.status}`);
            }
            return response.blob();
          })
          .then((blob) => {
            const a = document.createElement("a");
            const url = window.URL.createObjectURL(blob);
            a.href = url;
            a.download = filePath.split("/").pop();
            document.body.appendChild(a);
            a.click();
            window.URL.revokeObjectURL(url);
            document.body.removeChild(a);
            showInfo(`File "${filePath}" downloaded successfully`);
          })
          .catch((error) => {
            console.error("Error downloading file:", error);
            alert("Failed to download file");
          });
      })
      .catch(onError);
  }

  function shareFile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const fileName = document.getElementById("share-file-name").value;
    const shareWithUser = document.getElementById("share-with-user").value;
    const filePath = `/${currentUser.name}/${fileName}`;
    const sharedFilePath = `/${shareWithUser}/shared_with_me/${fileName}`;

    Backendless.Files.copyFile(filePath, sharedFilePath)
      .then(() => {
        showInfo("File shared successfully");
      })
      .catch(onError);
  }

  function listSharedFiles() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const path = `/${currentUser.name}/shared_with_me`;

    Backendless.Files.listing(path)
      .then((files) => {
        const fileList = files.map((file) => file.name).join(", ");
        showInfo("Shared files: " + fileList);
      })
      .catch(onError);
  }

  function logout() {
    Backendless.UserService.logout()
      .then(() => {
        currentUser = null;
        window.location.href =
          "../authentication/authorization/authorization.html";
      })
      .catch(onError);
  }

  function onError(error) {
    console.error("An error occurred:", error);
    alert(error.message || "An error occurred");
  }

  function showInfo(text) {
    const messageElement = document.getElementById("message");
    if (!messageElement) {
      console.error("Message element not found");
      return;
    }
    messageElement.textContent = text;
    messageElement.classList.add("visible");

    setTimeout(() => {
      messageElement.classList.remove("visible");
    }, 5000);
  }
})(Backendless);
