(function (Backendless) {
  const APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  const SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";

  Backendless.initApp(APPLICATION_ID, SECRET_KEY);

  document
    .getElementById("forgot-password-btn")
    ?.addEventListener("click", resetPassword);

  function resetPassword() {
    const name = document.getElementById("forgot-password-name").value;

    Backendless.UserService.restorePassword(name)
      .then(() => showInfo("Password reset instructions sent to your email."))
      .catch(onError);
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
