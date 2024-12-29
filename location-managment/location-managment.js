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

  function initEventHandlers() {
    document
      .getElementById("add-place-btn")
      .addEventListener("click", addPlace);

    document
      .getElementById("add-current-user-place-btn")
      .addEventListener("click", addCurrentUserPlace);

    document
      .getElementById("delete-place-btn")
      .addEventListener("click", deletePlace);

    document
      .getElementById("search-places-btn")
      .addEventListener("click", searchPlaces);

    document
      .getElementById("like-place-btn")
      .addEventListener("click", likePlace);

    document
      .getElementById("view-liked-places-btn")
      .addEventListener("click", viewLikedPlaces);

    document
      .getElementById("view-my-places-btn")
      .addEventListener("click", viewMyPlaces);

    document
      .getElementById("view-place-on-map-btn")
      .addEventListener("click", viewPlaceOnMap);

    document.getElementById("logout-btn")?.addEventListener("click", logout);
  }

  function addPlace() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          showInfo("Please login first");
          return;
        }

        var latitude = parseFloat(
          document.getElementById("place-latitude").value
        );
        var longitude = parseFloat(
          document.getElementById("place-longitude").value
        );

        var place = {
          category: document.getElementById("place-category").value,
          description: document.getElementById("place-description").value,
          hashtags: document
            .getElementById("place-tags")
            .value.split(",")
            .join(","),
          location: { type: "Point", coordinates: [longitude, latitude] },
          name: document.getElementById("place-name").value,
          ownerId: currentUser.objectId,
        };

        var photo = document.getElementById("place-photo-input");

        if (photo.files.length > 0) {
          var file = photo.files[0];
          var path = `users/${currentUser.objectId}/places/${Date.now()}_${
            file.name
          }`;

          Backendless.Files.upload(file, path, true)
            .then((uploadedFile) => {
              var fileUrl = uploadedFile.fileURL;
              place["photo"] = fileUrl;
              updatePlaceTable(place);
            })
            .catch(onError);
        } else {
          updatePlaceTable(place);
        }
      })
      .catch(onError);
  }

  function updatePlaceTable(place) {
    Backendless.Data.of("Place")
      .save(place)
      .then((savedPlace) => {
        showInfo(`Place "${savedPlace.name}" added successfully.`);
      })
      .catch(onError);
  }

  function addCurrentUserPlace() {
    navigator.geolocation.getCurrentPosition((position) => {
      document.getElementById("place-latitude").value =
        position.coords.latitude;
      document.getElementById("place-longitude").value =
        position.coords.longitude;
    });
  }

  function deletePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var placeName = document.getElementById("place-to-delete").value;

    Backendless.Data.of("Place")
      .findFirst({
        where: `name = '${placeName}' AND ownerId = '${currentUser.objectId}'`,
      })
      .then((place) => {
        if (place) {
          return Backendless.Data.of("Place").remove(place);
        } else {
          showInfo(
            "You can only delete your own places or the place may not exist."
          );
        }
      })
      .then(() => showInfo("Place deleted successfully"))
      .catch(onError);
  }

  function searchPlaces() {
    var searchQuery = document.getElementById("place-search-name").value;
    var searchCategory = document.getElementById("place-search-category").value;
    var radius = parseFloat(document.getElementById("search-radius").value);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        var whereClauses = [];
        if (searchQuery) whereClauses.push(`name LIKE '%${searchQuery}%'`);
        if (searchCategory) whereClauses.push(`category = '${searchCategory}'`);

        var queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setWhereClause(whereClauses.join(" AND "));
        queryBuilder.setProperties([
          "objectId",
          "photo",
          "name",
          "category",
          "description",
          "location",
          "hashtags",
        ]);
        queryBuilder.setPageSize(20);

        Backendless.Data.of("Place")
          .find(queryBuilder)
          .then((places) => {
            var resultsContainer = document.getElementById("search-results");
            if (places.length > 0) {
              resultsContainer.innerHTML = places
                .map((place) => {
                  var location = [place.location.x, place.location.y];

                  var distance = calculateDistance(
                    position.coords.latitude,
                    position.coords.longitude,
                    place.location.y,
                    place.location.x
                  );

                  var locationText =
                    location && location.length === 2
                      ? `${location[0]}, ${location[1]}`
                      : "Not available";

                  if (distance <= radius) {
                    showInfo("Places found successfully.");
                    return `
                    <div>
                    <img src="${place.photo || "placeholder.jpg"}" alt="${
                      place.name || "Place photo"
                    }" style="height: 100px; object-fit: cover;"><br>
                      <strong>${place.name}</strong><br>
                      Category: ${place.category}<br>
                      Hashtags: ${place.hashtags}<br>
                      Location: ${locationText}<br>
                      Distance: ${distance.toFixed(2)} km
                    </div><hr>
                  `;
                  } else {
                    showInfo("No places found within the specified radius.");
                    resultsContainer.innerHTML =
                      "<p>No places found matching the criteria.</p>";
                  }
                })
                .join("");
            } else {
              showInfo("No location is available right now.");
              resultsContainer.innerHTML =
                "<p>No places found matching the criteria.</p>";
            }
          })
          .catch(onError);
      },
      (error) => {
        console.error(onError);
        showInfo("Failed to retrieve current location.");
      }
    );
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

  function likePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var placeName = document.getElementById("place-to-like").value;

    Backendless.Data.of("Place")
      .findFirst({ where: `name = '${placeName}'` })
      .then((place) => {
        if (!place) {
          showInfo("Place not found.");
          return;
        }

        return Backendless.Data.of("Place_Likes")
          .findFirst({
            where: `placeId = '${place.objectId}' AND likedById = '${currentUser.objectId}'`,
          })
          .then((existingLike) => {
            if (existingLike) {
              showInfo("You have already liked this place.");
              return;
            }

            return Backendless.Data.of("Place")
              .findFirst({
                where: `name = '${placeName}'`,
              })
              .then((placeOwner) => {
                var like = {
                  placeId: place.objectId,
                  likedById: currentUser.objectId,
                  postedById: placeOwner.ownerId,
                };
                showInfo("Place liked successfully");
                return Backendless.Data.of("Place_Likes").save(like);
              });
          });
      })
      .catch(onError);
  }

  function viewLikedPlaces() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    Backendless.Data.of("Place_Likes")
      .find({
        condition: `likedById = '${currentUser.objectId}'`,
        properties: ["placeId"],
      })
      .then((likes) => {
        if (likes.length === 0) {
          showInfo("You have not liked any places yet.");
          return [];
        }

        var placeIds = likes.map((like) => like.placeId);
        console.log(`Place IDs: ${placeIds}`);

        return Backendless.Data.of("Place")
          .find({
            condition: `objectId IN (${placeIds
              .map((id) => `'${id}'`)
              .join(",")})`,
            properties: ["name", "description", "photo", "objectId"],
          })
          .then((places) => {
            var filteredPlaces = places.filter((place) =>
              placeIds.includes(place.objectId)
            );
            console.log("Filtered places:", filteredPlaces);
            return filteredPlaces;
          });
      })
      .then((filteredPlaces) => {
        if (!filteredPlaces || filteredPlaces.length === 0) {
          showInfo("No liked places found.");
          return;
        }

        var placesHtml = filteredPlaces
          .map(
            (place) => `
            <div class="col-4 mb-3">
              <div class="card">
                <img src="${
                  place.photo || "placeholder.jpg"
                }" class="card-img-top" alt="${
              place.name || "Place photo"
            }" style="height: 150px; object-fit: cover;">
                <div class="card-body text-center">
                  <h5 class="card-title">${place.name}</h5>
                  <p class="card-text">${
                    place.description || "No description available"
                  }</p>
                </div>
              </div>
            </div>
          `
          )
          .join("");

        var container = document.getElementById("liked-places-container");
        container.innerHTML = `<div class="row">${placesHtml}</div>`;

        if (filteredPlaces.length > 0) {
          var closeButton = document.createElement("button");
          closeButton.textContent = "Close Results";
          closeButton.classList.add("red-btn");
          closeButton.style.width = "auto";
          closeButton.style.marginTop = "20px";

          closeButton.addEventListener("click", () => {
            document.getElementById("liked-places-container").innerHTML = "";
          });

          container.appendChild(closeButton);
          showInfo("Places found successfully.");
        }
      })
      .catch((error) => {
        console.error("An error occurred:", error);
        showInfo("An error occurred while retrieving your liked places.");
      });
  }

  function viewMyPlaces() {
    Backendless.UserService.getCurrentUser()
      .then((currentUser) => {
        if (!currentUser) {
          showInfo("Please login first");
          return;
        }

        Backendless.Data.of("Place")
          .find({ where: `ownerId = '${currentUser.objectId}'` })
          .then((places) => {
            console.log("Places:", places);
            var resultsContainer = document.getElementById(
              "my-places-container"
            );
            if (places.length > 0) {
              resultsContainer.innerHTML = places
                .map((place) => {
                  console.log("Place:", place);
                  var location = [place.location.x, place.location.y];

                  var locationText =
                    location && location.length === 2
                      ? `${location[0]}, ${location[1]}`
                      : "Not available";
                  console.log("locationText", locationText);

                  var photoHtml;
                  if (place.photo) {
                    photoHtml = `<img src="${place.photo}" class="img-search">`;
                  }

                  return `${photoHtml}
                  <div style="margin-top: 20px; text-align: left;">
                    <strong>${place.name}</strong><br>
                    Category: ${place.category}<br>
                    Hashtags: ${place.hashtags}<br>
                    Location: ${locationText}
                  </div>
                  <hr style="margin-top: 20px;">
                `;
                })
                .join("");

              if (resultsContainer.innerHTML.length > 0) {
                resultsContainer.innerHTML =
                  resultsContainer.innerHTML +
                  `
                <button type="button" id="close-view-results" class="red-btn" style="width: auto;">Close Results</button>
              `;
                document
                  .getElementById("close-view-results")
                  .addEventListener("click", () => {
                    document.getElementById("my-places-container").innerHTML =
                      "";
                  });
                showInfo("Places found successfully.");
              } else {
                resultsContainer.innerHTML =
                  '<p style="margin-top: 20px;">No places found matching the criteria.</p>';
                showInfo("No places found.");
              }
            } else {
              resultsContainer.innerHTML =
                '<p style="margin-top: 20px;">No places found matching the criteria.</p>';
              showInfo("No places found.");
            }
          })
          .catch(onError);
      })
      .catch(onError);
  }

  function viewPlaceOnMap() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var placeName = document.getElementById("place-to-view").value;

    Backendless.Data.of("Place")
      .findFirst({ where: `name = '${placeName}'` })
      .then((place) => {
        var latitude = place.location.y;
        var longitude = place.location.x;

        var zoomLevel = 12;

        var mapUrl = `https://www.google.com/maps?q=${latitude},${longitude}&z=${zoomLevel}&output=embed`;

        var viewPlace = document.getElementById("view-place-on-map-btn");
        var mapContainer = document.getElementById("map-container");

        var iframe = document.createElement("iframe");
        iframe.src = mapUrl;
        iframe.loading = "lazy";
        iframe.allowFullscreen = true;

        mapContainer.innerHTML = "";
        mapContainer.appendChild(iframe);
        mapContainer.style.display = "block";

        viewPlace.disabled = true;

        var closeButton = document.createElement("button");
        closeButton.textContent = "Close Map View";
        closeButton.classList.add("red-btn");
        closeButton.style.width = "auto";
        closeButton.style.marginTop = "20px";

        closeButton.addEventListener("click", () => {
          mapContainer.innerHTML = "";
          mapContainer.style.display = "none";
          viewPlace.disabled = false;
        });

        mapContainer.appendChild(closeButton);

        showInfo("Map loaded successfully.");
      })
      .catch(() => showInfo("Place not found"));
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
