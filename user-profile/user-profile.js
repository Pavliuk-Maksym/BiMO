(function (Backendless) {
  var APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  var SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";

  if (!APPLICATION_ID || !SECRET_KEY) {
    alert(
      "Missing application ID or secret key. Please configure Backendless settings."
    );
  }

  Backendless.initApp(APPLICATION_ID, SECRET_KEY);

  initCurrentUser();
  initEventHandlers();
  initProfilePhotoHandlers();
  initSubscriptions();

  function initCurrentUser() {
    Backendless.UserService.getCurrentUser()
      .then((user) => {
        if (!user) {
          alert("Please login first");
          return;
        }

        currentUser = user;

        if (currentUser.profilePhoto) {
          document.getElementById("profile-avatar").src =
            currentUser.profilePhoto;
        }
      })
      .catch((error) => {
        alert("Error retrieving current user");
        console.error(error);
      });
  }

  function initEventHandlers() {
    document.addEventListener("DOMContentLoaded", () => {
      fetch("../assets/footer.html")
        .then((response) => response.text())
        .then((html) => {
          document.getElementById("footer").innerHTML = html;

          var logoutButton = document
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
      .getElementById("toggle-location-tracking-btn")
      .addEventListener("click", toggleLocationTracking);

    document
      .getElementById("update-profile-btn")
      .addEventListener("click", updateProfile);

    document
      .getElementById("update-profile-photo-btn")
      .addEventListener("click", updateProfilePhoto);

    document
      .getElementById("save-avatar-btn")
      .addEventListener("click", saveSelectedAvatar);

    document.getElementById("close-modal-btn").addEventListener("click", () => {
      document.getElementById("avatar-selection-modal").style.display = "none";

      document
        .getElementById("save-photo-btn")
        .addEventListener("click", saveSelectedPhoto);
    });
  }

  function initProfilePhotoHandlers() {
    var updateProfilePhotoBtn = document.getElementById(
      "update-profile-photo-btn"
    );
    var profilePhotoInput = document.getElementById("profile-photo-input");
    var chooseExistingPhotoBtn = document.getElementById(
      "choose-existing-photo-btn"
    );
    var saveAvatarBtn = document.getElementById("save-avatar-btn");

    updateProfilePhotoBtn.addEventListener("click", function () {
      profilePhotoInput.click();
    });

    profilePhotoInput.addEventListener("change", handleProfilePhotoUpload);

    chooseExistingPhotoBtn.addEventListener("click", showExistingPhotos);

    saveAvatarBtn.addEventListener("click", saveSelectedPhoto);
  }

  function initSubscriptions() {
    Backendless.UserService.getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        showInfo("Please login first.");
        return;
      }
      console.log("user: ", currentUser);

      subscribeToNotifications(currentUser.objectId);

      var queryBuilder = Backendless.DataQueryBuilder.create();
      queryBuilder.setRelated(["fromUser", "toUser"]);
      queryBuilder.setWhereClause(`toUser = '${currentUser.objectId}'`);
      queryBuilder.setRelationsDepth(1);

      Backendless.Data.of("PendingFriendRequests")
        .find(queryBuilder)
        .then((pendingRequests) => {
          pendingRequests.forEach((request) => {
            console.log("Pending friend request:", request.fromUser.name);
          });
        });
    });
  }

  var trackingInterval;
  function toggleLocationTracking() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    if (trackingInterval) {
      clearInterval(trackingInterval);
      trackingInterval = null;
      showInfo("Location tracking disabled.");
    } else {
      showInfo("Location tracking enabled.");
      trackingInterval = setInterval(() => {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            var { latitude, longitude } = position.coords;
            currentUser["my location"] = {
              type: "Point",
              coordinates: [longitude, latitude],
            };
            Backendless.UserService.update(currentUser)
              .then((updatedUser) => {
                currentUser = updatedUser;
                console.log("Location updated:", currentUser["my location"]);
              })
              .catch(onError);
          },
          (error) => console.error("Geolocation error:", error),
          { enableHighAccuracy: true }
        );
      }, 60000);
    }
  }

  function updateProfile() {
    var user = currentUser;

    var fields = document.querySelectorAll(".profile-field");
    console.log("fields: ", fields);

    fields.forEach((field) => {
      user[field.name] = field.value;
    });

    user.age = Number(user.age);
    console.log("user: ", user);

    Backendless.UserService.update(user)
      .then(() => showInfo("Profile updated successfully"))
      .catch(onError);
  }

  function updateProfilePhoto() {
    var path = `users/${currentUser.objectId}/profile-photos`;
    Backendless.Files.listing(path).then((files) => {
      var imageFiles = files.filter((file) =>
        file.name.match(/\.(jpg|jpeg|png|gif)$/i)
      );
      var modalBody = document.getElementById("avatar-selection-modal");
      if (imageFiles.length) {
        modalBody.innerHTML = imageFiles
          .map((file) => {
            return `
            <div>
              <img src="${file.publicUrl}" alt="${file.name}" style="width: 100px; height: 100px; object-fit: cover;">
              <label>
                <input type="radio" name="avatar" value="${file.publicUrl}">
                Select
              </label>
            </div>
          `;
          })
          .join("");
        document.getElementById("avatar-selection-modal").style.display =
          "block";
      } else {
        modalBody.innerHTML =
          "<p>No photos found. Please upload some photos first.</p>";
        document.getElementById("avatar-selection-modal").style.display =
          "block";
      }
    });
  }

  function saveSelectedAvatar() {
    var avatar = document.querySelector(".avatar.selected");
    if (!avatar) {
      showInfo("Please select an avatar");
      return;
    }

    currentUser.profilePhoto = avatar.src;
    document.getElementById("profile-avatar").src = avatar.src;
    showInfo("Avatar selected successfully");

    document.getElementById("avatar-selection-modal").style.display = "none";
  }

  function saveSelectedPhoto() {
    var selectedPhotoInput = document.querySelector(
      'input[name="selected_photo"]:checked'
    );
    if (!selectedPhotoInput) {
      showInfo("Please select a photo.");
      return;
    }

    var selectedPhotoUrl = selectedPhotoInput.value;

    Backendless.UserService.update({
      objectId: currentUser.objectId,
      profilePhoto: selectedPhotoUrl,
    })
      .then((updatedUser) => {
        currentUser = updatedUser;

        document.getElementById("profile-avatar").src =
          currentUser.profilePhoto;

        document.getElementById("avatar-selection-modal").style.display =
          "none";

        showInfo("Profile photo updated successfully.");
      })
      .catch((error) => {
        console.error("Error updating profile photo:", error);
        showInfo("Error updating profile photo: " + error.message);
      });
  }

  function showExistingPhotos() {
    if (!currentUser) {
      showInfo("Please login first.");
      return;
    }

    var path = `users/${currentUser.objectId}/photos/`;

    Backendless.Files.listing(path, "*", true)
      .then((files) => {
        var imageFiles = files.filter((file) =>
          file.name.toLowerCase().match(/\.(jpg|jpeg|png)$/)
        );

        filesUrls = imageFiles.map((file) => file.publicUrl);

        var modalBody = document.querySelector(
          "#avatar-selection-modal .modal-body"
        );

        if (imageFiles.length === 0) {
          showInfo("No photos found. Please upload some photos first.");
        } else {
          var photosHtml = imageFiles
            .map(
              (file) => `
            <div class="col-4 mb-3">
              <div class="card">
                <img src="${file.publicUrl}" class="card-img-top" style="height: 150px; object-fit: cover;">
                <div class="card-body text-center">
                  <input type="radio" name="selected_photo" value="${file.publicUrl}" class="form-check-input">
                </div>
              </div>
            </div>
          `
            )
            .join("");

          modalBody.innerHTML = `<div class="row">${photosHtml}</div>`;
        }

        document.getElementById("avatar-selection-modal").style.display =
          "block";
      })
      .catch((error) => {
        console.error("Error loading photos:", error);
        showInfo("Error loading photos: " + error.message);
      });
  }

  function handleProfilePhotoUpload(event) {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var file = event.target.files[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      showInfo("Please select a valid image file.");
      return;
    }

    showInfo("Uploading profile photo...");

    var photoPath = `users/${currentUser.objectId}/photos/${Date.now()}_${
      file.name
    }`;

    Backendless.Files.upload(file, photoPath, true)
      .then((uploadedFile) => {
        return Backendless.UserService.update({
          objectId: currentUser.objectId,
          profilePhoto: uploadedFile.fileURL,
        });
      })
      .then((updatedUser) => {
        currentUser = updatedUser;

        document.getElementById("profile-avatar").src =
          currentUser.profilePhoto;

        showInfo("Profile photo updated successfully.");
      })
      .catch((error) => {
        console.error("Error uploading photo:", error);
        showInfo("Error uploading photo: " + error.message);
      });
  }

  let channel;
  let messageListener;

  function subscribeToNotifications(currentUserName) {
    channel = Backendless.Messaging.subscribe("friendRequests");
    var selector = `name = '${currentUserName}'`;

    messageListener = (message) => {
      console.log("New friend request notification:", message);
      showInfo(message);
    };

    channel.addMessageListener(selector, () => {
      onMessage(messageListener);
    });

    console.log(`Subscribed to notifications for: ${currentUserName}`);
  }

  function onMessage(stringMessage) {
    console.log("Message received: " + stringMessage.data);
    showInfo("Message received: " + stringMessage.data);
  }

  function subscribeToDatabaseUpdates() {
    Backendless.Data.of("FriendRequests")
      .rt()
      .addUpdateListener(function (updatedObject) {
        console.log("Database update:", updatedObject);
      });

    Backendless.Data.of("FriendRequests")
      .rt()
      .addCreateListener(function (newObject) {
        console.log("New database entry:", newObject);
      });
  }

  function logout() {
    Backendless.UserService.getCurrentUser().then((currentUser) => {
      if (!channel || !messageListener) {
        console.error("Channel or messageListener is not initialized");
        return;
      }

      var selector = `name = '${currentUser.name}'`;

      channel.removeMessageListener(selector, messageListener);
      console.log(`Unsubscribed from notifications for: ${currentUser.name}`);

      Backendless.UserService.logout()
        .then(() => {
          showInfo("User logged out successfully");
          window.location.href =
            "../authentication/authorization/authorization.html";
        })
        .catch(onError);
    });
  }

  function onError(error) {
    console.error("An error occurred:", error);
    alert(error.message || "An error occurred");
  }

  function showInfo(text) {
    var messageElement = document.getElementById("message");
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
