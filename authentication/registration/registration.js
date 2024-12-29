(function (Backendless) {
  var APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  var SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";

  if (!APPLICATION_ID || !SECRET_KEY) {
    alert(
      "Missing application ID or secret key. Please configure Backendless settings."
    );
  }

  Backendless.initApp(APPLICATION_ID, SECRET_KEY);

  document
    .getElementById("register-btn")
    ?.addEventListener("click", registerUser);
  document.getElementById("logout-btn")?.addEventListener("click", logout);

  function registerUser() {
    var user = new Backendless.User();

    var fields = document.querySelectorAll(".register-field");

    fields.forEach((field) => {
      user[field.name] = field.value;
    });

    user.age = Number(user.age);

    if (!validateUser(user)) return;

    Backendless.UserService.register(user)
      .then(() =>
        showInfo(
          "User registered successfully. Please check your email to confirm registration."
        )
      )
      .then(() => createSharedFolder(user.name))
      .catch(onError);
  }

  function createSharedFolder(name) {
    var sharedFolderPath = "/" + name + "/shared_with_me";
    return Backendless.Files.createDirectory(sharedFolderPath);
  }

  function validateUser(user) {
    if (
      !user.name ||
      !user.email ||
      !user.password ||
      !user.age ||
      !user.gender ||
      !user.country
    ) {
      alert("All fields are required.");
      return false;
    }
    return true;
  }

  function logout() {
    Backendless.UserService.logout()
      .then(() => {
        showInfo("User logged out successfully");
        currentUser = null;
      })
      .catch(onError);
  }

  function onError(error) {
    console.error("An error occurred:", error);
    showInfo(error.message || "An error occurred");
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
