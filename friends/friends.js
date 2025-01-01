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
    // Добавляем обработчики событий для кнопок
    const addFriendButton = document.getElementById("add-friend-btn");
    const deleteFriendButton = document.getElementById("delete-friend-btn");
    const findFriendButton = document.getElementById("find-friend-btn");
    const showFriendsButton = document.getElementById("show-friends-btn");

    if (addFriendButton) {
      addFriendButton.addEventListener("click", addFriend);
    } else {
      console.error("Add Friend button not found");
    }

    if (deleteFriendButton) {
      deleteFriendButton.addEventListener("click", deleteFriend);
    } else {
      console.error("Delete Friend button not found");
    }

    if (showFriendsButton) {
      showFriendsButton.addEventListener("click", showFriends);
    } else {
      console.error("Show Friends button not found");
    }

    if (findFriendButton) {
      findFriendButton.addEventListener("click", findFriend);
    } else {
      console.error("Find Friend button not found");
    }

    // Загрузка и настройка футера
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

  function showFriends() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          showInfo("Please login first");
          return;
        }

        const objectId = currentUser.objectId;

        const loadRelationsQueryBuilder =
          Backendless.LoadRelationsQueryBuilder.create();
        loadRelationsQueryBuilder.setRelationName("friends");

        Backendless.Data.of("Users")
          .loadRelations(objectId, loadRelationsQueryBuilder)
          .then((friendsArray) => {
            console.log("Friends:", friendsArray);

            const resultsContainer =
              document.getElementById("friends-container");
            if (friendsArray.length > 0) {
              resultsContainer.innerHTML = friendsArray
                .map((friend) => {
                  console.log("Friend:", friend);

                  var photoHtml = friend.photo
                    ? `<img src="${friend.photo}" class="img-search">`
                    : `<img src="../user-profile/placeholder-avatar.png" class="img-search">`;

                  return `${photoHtml}
                  <div style="margin-top: 20px; text-align: left;">
                    <strong>${friend.name || "Name not available"}</strong><br>
                    Email: ${friend.email || "Email not available"}<br>
                    Can be Searched: ${friend["my location"] ? "Yes" : "No"}<br>
                  </div>
                  <hr style="margin-top: 20px;">
                `;
                })
                .join("");

              if (resultsContainer.innerHTML.length > 0) {
                resultsContainer.innerHTML += `
                <button type="button" id="close-view-friends" class="red-btn" style="width: auto;">Close Results</button>
              `;
                document
                  .getElementById("close-view-friends")
                  .addEventListener("click", () => {
                    document.getElementById("friends-container").innerHTML = "";
                  });
                showInfo("Friends found successfully.");
              } else {
                resultsContainer.innerHTML =
                  '<p style="margin-top: 20px;">No friends found.</p>';
                showInfo("No friends found.");
              }
            } else {
              resultsContainer.innerHTML =
                '<p style="margin-top: 20px;">No friends found.</p>';
              showInfo("No friends found.");
            }
          })
          .catch(onError);
      })
      .catch(onError);
  }

  function deleteFriend() {}
  function findFriend() {}
  function addFriend() {}

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
