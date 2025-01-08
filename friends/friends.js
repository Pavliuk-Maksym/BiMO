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
  showPendingRequests();
  initSubscriptions();

  function initEventHandlers() {
    const addFriendButton = document.getElementById("add-friend-btn");
    const deleteFriendButton = document.getElementById("delete-friend-btn");
    const findFriendButton = document.getElementById("find-friend-btn");
    const showFriendsButton = document.getElementById("show-friends-btn");

    if (addFriendButton) {
      addFriendButton.addEventListener("click", sendFriendRequest);
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

  function sendFriendRequest() {
    Backendless.UserService.getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        showInfo("Please login first");
        return Promise.reject("User is not logged in.");
      }

      const userNameToSendRequest =
        document.getElementById("friend-to-add").value;
      const queryBuilder = Backendless.DataQueryBuilder.create();
      queryBuilder.setWhereClause(`name = '${userNameToSendRequest}'`);

      return Backendless.Data.of("Users")
        .findFirst(queryBuilder)
        .then((userToSendRequest) => {
          if (!userToSendRequest) {
            showInfo(`User with name "${userNameToSendRequest}" not found.`);
            return Promise.reject("User not found.");
          }

          const pendingRequest = {
            fromUser: currentUser.objectId,
            toUser: userToSendRequest.objectId,
          };

          return Backendless.Data.of("PendingFriendRequests")
            .save(pendingRequest)
            .then((savedRequest) => {
              console.log("Pending friend request saved:", savedRequest);

              Backendless.Data.of("PendingFriendRequests").setRelation(
                savedRequest.objectId,
                "fromUser",
                [currentUser.objectId]
              );
              Backendless.Data.of("PendingFriendRequests").setRelation(
                savedRequest.objectId,
                "toUser",
                [userToSendRequest.objectId]
              );

              publishNotification(userNameToSendRequest);
              showInfo("Friend request sent!");
            })
            .then({})
            .catch((error) => {
              console.error("Error saving friend request:", error);
              showInfo("Failed to send friend request.");
            });
        })
        .catch((error) => {
          console.error("Error finding user:", error);
        });
    });
  }

  function publishNotification(userNameToSendRequest) {
    const channel = "friendRequests";
    const message = "You have a new friend request!";
    console.log("user name to send reqtuest: ", userNameToSendRequest);

    // Опции публикации с указанием хедеров
    const pubOps = new Backendless.PublishOptions({
      headers: {
        name: userNameToSendRequest,
      },
    });

    console.log("pub ops: ", pubOps);

    // Публикация сообщения
    Backendless.Messaging.publish(channel, message, pubOps)
      .then(() => {
        console.log(
          "Notification published successfully to:",
          userNameToSendRequest
        );
      })
      .catch((error) => {
        console.error("Error publishing notification:", error);
      });
  }

  // function publishNotification(userNameToSendRequest) {
  //   const channel = "friendRequests";
  //   const message = `You have a new friend request!`;
  //   const pubOps = new Backendless.PublishOptions({
  //     headers: {
  //       name: `${userNameToSendRequest}`,
  //     },
  //   });

  //   Backendless.Messaging.publish(channel, message, pubOps)
  //     .then(() => {
  //       console.log(
  //         "Notification published successfully to: ",
  //         userNameToSendRequest
  //       );
  //     })
  //     .catch((error) => {
  //       console.error("Error publishing notification:", error);
  //     });
  // }

  function deleteFriend() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          showInfo("Please login first");
          return Promise.reject("User is not logged in.");
        }

        const friendName = document
          .getElementById("friend-to-delete")
          .value.trim();
        if (!friendName) {
          showInfo("Please enter the friend's name.");
          return Promise.reject("Friend name is not provided.");
        }

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setWhereClause(`name = '${friendName}'`);
        queryBuilder.addProperties("objectId", "name");

        return Backendless.Data.of("Users")
          .findFirst(queryBuilder)
          .then((friend) => {
            if (!friend) {
              showInfo(`Friend "${friendName}" not found.`);
              return Promise.reject("Friend not found.");
            }

            return Backendless.Data.of("Users")
              .deleteRelation(currentUser.objectId, "friends", [
                friend.objectId,
              ])
              .then(() => {
                return Backendless.Data.of("Users").deleteRelation(
                  friend.objectId,
                  "friends",
                  [currentUser.objectId]
                );
              })
              .then(() => {
                showInfo(`Friend "${friendName}" successfully removed.`);
              });
          });
      })
      .catch(onError);
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

  function showPendingRequests() {
    Backendless.UserService.getCurrentUser().then((currentUser) => {
      if (!currentUser) {
        showInfo("Please login first.");
        return;
      }

      console.log("user: ", currentUser);

      const queryBuilder = Backendless.DataQueryBuilder.create();
      queryBuilder.setRelated(["fromUser", "toUser"]);
      queryBuilder.setWhereClause(
        `toUser.objectId = '${currentUser.objectId}'`
      );
      queryBuilder.setRelationsDepth(1);

      Backendless.Data.of("PendingFriendRequests")
        .find(queryBuilder)
        .then((pendingRequests) => {
          const container = document.getElementById(
            "pending-requests-container"
          );
          container.innerHTML = "";

          if (pendingRequests.length === 0) {
            container.innerHTML = "<p>No pending friend requests.</p>";
            return;
          }

          pendingRequests.forEach((request) => {
            const fromUser = request.fromUser;

            const requestCard = document.createElement("div");
            requestCard.classList.add("pending-request-card");

            const userPhoto = document.createElement("img");
            userPhoto.src =
              fromUser.photo || "../user-profile/placeholder-avatar.png";
            userPhoto.alt = `${fromUser.name}'s photo`;
            userPhoto.classList.add("user-photo");

            const userInfo = document.createElement("div");
            userInfo.classList.add("user-info");

            const userName = document.createElement("h3");
            userName.textContent = fromUser.name;

            const userEmail = document.createElement("p");
            userEmail.textContent = fromUser.email;

            const buttonsContainer = document.createElement("div");
            buttonsContainer.classList.add("buttons-container");
            buttonsContainer.style.display = "flex";
            buttonsContainer.style.flexDirection = "row";

            const acceptButton = document.createElement("button");
            acceptButton.textContent = "Accept";
            acceptButton.classList.add("accept-btn");

            const declineButton = document.createElement("button");
            declineButton.textContent = "Decline";
            declineButton.classList.add("decline-btn");

            const separator = document.createElement("hr");
            separator.classList.add("card-separator");

            buttonsContainer.appendChild(acceptButton);
            buttonsContainer.appendChild(declineButton);

            userInfo.appendChild(userName);
            userInfo.appendChild(userEmail);
            requestCard.appendChild(userPhoto);
            requestCard.appendChild(userInfo);
            requestCard.appendChild(buttonsContainer);
            container.appendChild(separator);
            container.appendChild(requestCard);

            acceptButton.addEventListener("click", () =>
              handleRequest(currentUser, fromUser, true)
            );
            declineButton.addEventListener("click", () =>
              handleRequest(currentUser, fromUser, false)
            );
          });
        })
        .catch((error) => {
          console.error("Error fetching pending friend requests:", error);
          showInfo("Failed to load pending friend requests.");
        });
    });
  }

  function handleRequest(currentUser, fromUser, isAccepted) {
    if (isAccepted) {
      Backendless.Data.of("Users")
        .addRelation(currentUser.objectId, "friends", [fromUser.objectId])
        .then(() => {
          showInfo(`${fromUser.name} has been added to your friends list.`);
          removePendingRequest(fromUser);
        })
        .catch((error) => {
          console.error("Error accepting friend request:", error);
          showInfo("Failed to accept friend request.");
        });
    } else {
      removePendingRequest(fromUser).then(() => {
        showInfo(`Friend request from ${fromUser.name} has been declined.`);
      });
    }
  }

  function removePendingRequest(fromUser) {
    const queryBuilder = Backendless.DataQueryBuilder.create();
    queryBuilder.setWhereClause(`fromUser.objectId = '${fromUser.objectId}'`);

    return Backendless.Data.of("PendingFriendRequests")
      .findFirst(queryBuilder)
      .then((pendingRequest) => {
        if (!pendingRequest || !pendingRequest.objectId) {
          throw new Error("Pending request not found or objectId is missing.");
        }

        return Backendless.Data.of("PendingFriendRequests").remove(
          pendingRequest.objectId
        );
      })
      .then(() => {
        console.log("Pending request removed for user:", fromUser.name);
        showPendingRequests();
      })
      .catch((error) => {
        console.error("Error removing pending request:", error);
      });
  }

  function findFriend() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          showInfo("Please login first");
          return Promise.reject("User is not logged in.");
        }

        console.log("CurrentUser: ", currentUser);

        if (
          !currentUser["my location"] ||
          !currentUser["my location"].x ||
          !currentUser["my location"].y
        ) {
          showInfo("Please enable your geolocation first.");
          return Promise.reject("User's location is not available.");
        }

        const myLocation = {
          latitude: currentUser["my location"].y,
          longitude: currentUser["my location"].x,
        };

        const friendName = document
          .getElementById("friend-to-find")
          .value.trim();
        if (!friendName) {
          showInfo("Please enter the friend's name.");
          return Promise.reject("Friend name is not provided.");
        }

        console.log("Searching for friend:", friendName);

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setRelated(["friends"]);

        return Backendless.Data.of("Users")
          .findById(currentUser.objectId, queryBuilder)
          .then((userWithFriends) => {
            const friends = userWithFriends.friends;

            if (!friends || friends.length === 0) {
              showInfo("You have no friends to search for.");
              return Promise.reject("No friends found.");
            }

            console.log("Friends loaded:", friends);

            const friend = friends.find((f) => f.name === friendName);

            if (!friend) {
              showInfo(
                `Friend "${friendName}" not found in your friends list.`
              );
              return Promise.reject("Friend not found.");
            }

            console.log("Friend found:", friend);

            if (
              !friend["my location"] ||
              !friend["my location"].x ||
              !friend["my location"].y
            ) {
              showInfo(`Location tracking is disabled for "${friendName}".`);
              return Promise.reject("Friend's location is not available.");
            }

            const friendLocation = {
              latitude: friend["my location"].y,
              longitude: friend["my location"].x,
            };

            const radius = parseFloat(document.getElementById("radius").value);
            const distance = calculateDistance(
              myLocation.latitude,
              myLocation.longitude,
              friendLocation.latitude,
              friendLocation.longitude
            );

            if (distance > radius) {
              showInfo(
                `"${friendName}" is outside the ${radius}km radius from your location.`
              );
              return Promise.reject("Friend is outside the radius.");
            }

            console.log(`"${friendName}" is within ${radius}km radius.`);

            const mapUrl = `https://www.google.com/maps?q=${friendLocation.latitude},${friendLocation.longitude}&z=12&output=embed`;

            const mapContainer = document.getElementById("map-container");
            const iframe = document.createElement("iframe");
            iframe.src = mapUrl;
            iframe.loading = "lazy";
            iframe.allowFullscreen = true;

            mapContainer.innerHTML = "";
            mapContainer.appendChild(iframe);
            mapContainer.style.display = "block";

            const closeButton = document.createElement("button");
            closeButton.textContent = "Close Map View";
            closeButton.classList.add("red-btn");
            closeButton.style.width = "auto";
            closeButton.style.marginTop = "20px";

            closeButton.addEventListener("click", () => {
              mapContainer.innerHTML = "";
              mapContainer.style.display = "none";
            });

            mapContainer.appendChild(closeButton);

            showInfo(`"${friendName}"'s location is displayed on the map.`);
          });
      })
      .catch((error) => {
        console.error("Error in findFriend:", error);
      });
  }

  function calculateDistance(lat1, lon1, lat2, lon2) {
    var R = 6371;
    var toRad = (value) => (value * Math.PI) / 180;

    var dLat = toRad(lat2 - lat1);
    var dLon = toRad(lon2 - lon1);

    var a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    var distance = R * c;
    return distance;
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

  let channel;
  let messageListener;

  function subscribeToNotifications(currentUserName) {
    channel = Backendless.Messaging.subscribe("friendRequests");

    const selector = `name = '${currentUserName}'`;

    messageListener = (message) => {
      if (message.headers.name === currentUserName) {
        console.log("New friend request notification:", message);
        showInfo("You have new friend requests!");
      }
    };

    channel.addMessageListener(selector, messageListener);

    console.log(`Subscribed to notifications for: ${currentUserName}`);
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
