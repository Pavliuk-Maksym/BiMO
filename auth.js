(function (Backendless) {
  const APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  const SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";
  currentUser = null;

  if (!APPLICATION_ID || !SECRET_KEY) {
    alert(
      "Missing application ID or secret key. Please configure Backendless settings."
    );
  }

  Backendless.initApp(APPLICATION_ID, SECRET_KEY);

  document
    .getElementById("register-btn")
    ?.addEventListener("click", registerUser);
  document.getElementById("login-btn")?.addEventListener("click", loginUser);
  document
    .getElementById("forgot-password-btn")
    ?.addEventListener("click", resetPassword);

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
      .catch(alert(onError));
  }

  function createSharedFolder(name) {
    const sharedFolderPath = "/" + name + "/shared_with_me";
    return Backendless.Files.createDirectory(sharedFolderPath);
  }

  function loginUser() {
    const login = {};

    document.querySelectorAll(".login-field").forEach((input) => {
      login[input.name] = input.value;
    });

    showInfo("Logging in...");

    Backendless.UserService.login(login.name, login.password, true)
      .then((user) => {
        if (user) {
          showInfo("Login successful");
          setTimeout(() => {
            window.location.href = "dashboard.html";
          }, 1000);
        } else {
          showInfo("Login failed");
        }
      })
      .catch(onError);
  }

  Backendless.UserService.logout()
    .then(() => showInfo("User logged out successfully"))
    .then(() => console.log("Logged out from first page"))
    .catch((err) => console.error("Error during logout:", err));

  function resetPassword() {
    const name = document.getElementById("forgot-password-name").value;

    Backendless.UserService.restorePassword(name)
      .then(() => showInfo("Password reset instructions sent to your email."))
      .catch(alert(onError));
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

  function onError(error) {
    console.error("An error occurred:", error);
    showInfo(error.message || "An error occurred");
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
