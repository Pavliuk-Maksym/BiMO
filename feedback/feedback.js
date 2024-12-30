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
    document.addEventListener("DOMContentLoaded", () => {
      fetch("../assets/footer.html")
        .then((response) => response.text())
        .then((html) => {
          document.getElementById("footer").innerHTML = html;

          const logoutButton = document
            .getElementById("footer")
            ?.querySelector(".footer-nav #logout-btn");

          const feedbackButton = document
            .getElementById("footer")
            ?.querySelector(".footer-nav #feedback-btn");

          if (feedbackButton) {
            feedbackButton.style.display = "none";
          } else {
            console.error("Feedback button not found in footer.");
          }

          if (logoutButton) {
            logoutButton.addEventListener("click", logout);
          } else {
            console.error("Logout button not found in footer.");
          }
        })
        .catch((error) => console.error("Error loading footer:", error));
    });

    document
      .getElementById("send-feedback-btn")
      ?.addEventListener("click", sendFeedback);
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

  function sendFeedback() {
    const theme = document.getElementById("feedback-theme").value;
    const message = document.getElementById("feedback-message").value;

    if (!theme || !message) {
      alert("Please, provie a feedback.");
      return;
    }

    var bodyParts = new Backendless.Bodyparts();
    bodyParts.textmessage = message;

    var recipient = ["maksym.pavliuk@nure.ua"];
    var subject = theme;
    var attachment = null;

    Backendless.Messaging.sendEmail(subject, bodyParts, recipient, attachment);
    showInfo("Your Feedback has been successfully send!");
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
