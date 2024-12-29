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

  function initEventHandlers() {
    document.getElementById("logout-btn")?.addEventListener("click", logout);

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
    });
  }

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

  function updateProfile() {
    var user = currentUser;

    var fields = document.querySelectorAll(".profile-field");

    fields.forEach((field) => {
      user[field.name] = field.value;
    });

    user.age = Number(user.age);

    Backendless.UserService.update(user)
      .then(() => showInfo("Profile updated successfully"))
      .catch(onError);
  }

  function updateProfilePhoto() {
    var file = document.getElementById("profile-photo").files[0];
    if (!file) {
      showInfo("Please select a file");
      return;
    }

    var filePath = `profile_photos/${currentUser.objectId}/${file.name}`;

    Backendless.Files.upload(file, filePath)
      .then((response) => {
        currentUser.profilePhoto = response.fileURL;
        document.getElementById("profile-avatar").src = response.fileURL;
        showInfo("Profile photo updated successfully");
      })
      .catch(onError);
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

  function logout() {
    Backendless.UserService.logout()
      .then(() => {
        showInfo("User logged out successfully");
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
