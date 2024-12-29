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
  initProfilePhotoHandlers();
  initEventHandlers();

  function initEventHandlers() {
    document.getElementById("logout-btn")?.addEventListener("click", logout);
    document
      .getElementById("update-profile-btn")
      .addEventListener("click", updateProfile);
    document
      .getElementById("toggle-location-tracking-btn")
      .addEventListener("click", toggleLocationTracking);
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
    document
      .getElementById("update-profile-photo-btn")
      .addEventListener("click", updateProfilePhoto);
    document
      .getElementById("save-avatar-btn")
      .addEventListener("click", saveSelectedAvatar);
    document.getElementById("close-modal-btn").addEventListener("click", () => {
      document.getElementById("avatar-selection-modal").style.display = "none";
      // document
      //   .getElementById("choose-place-photo-btn")
      //   .addEventListener("click", showPhotoSelectionModal);
      document
        .getElementById("save-photo-btn")
        .addEventListener("click", saveSelectedPhoto);
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

  function updateProfile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    oldUserName = currentUser.name;

    var name = document.getElementById("profile-name").value;
    var email = document.getElementById("profile-email").value;
    var age = document.getElementById("profile-age").value;
    var gender = document.getElementById("profile-gender").value;
    var country = document.getElementById("profile-country").value;

    currentUser.name = name;
    currentUser.email = email;
    currentUser.age = Number(age);
    currentUser.gender = gender;
    currentUser.country = country;

    Backendless.UserService.update(currentUser)
      .then((updatedUser) => {
        currentUser = updatedUser;
        showInfo("Profile updated successfully");
      })
      .catch(onError);
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
        var latitude = position.coords.latitude;
        var longitude = position.coords.longitude;

        var whereClauses = [];
        if (searchQuery) whereClauses.push(`name LIKE '%${searchQuery}%'`);
        if (searchCategory) whereClauses.push(`category = '${searchCategory}'`);

        var queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setWhereClause(whereClauses.join(" AND "));
        queryBuilder.setProperties([
          "objectId",
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
                    return `
                      <div>
                        <strong>${place.name}</strong><br>
                        Category: ${place.category}<br>
                        Hashtags: ${place.hashtags}<br>
                        Location: ${locationText}<br>
                        Distance: ${distance.toFixed(2)} km
                      </div><hr>
                    `;
                  }
                })
                .join("");
              showInfo("Places found successfully.");
            } else {
              resultsContainer.innerHTML =
                "<p>No places found matching the criteria.</p>";
              showInfo("No places found.");
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
    const R = 6371;
    const toRad = (value) => (value * Math.PI) / 180;

    const dLat = toRad(lat2 - lat1);
    const dLon = toRad(lon2 - lon1);

    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(toRad(lat1)) *
        Math.cos(toRad(lat2)) *
        Math.sin(dLon / 2) *
        Math.sin(dLon / 2);

    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    const distance = R * c;
    return distance;
  }

  function likePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const placeName = document.getElementById("place-to-like").value;

    Backendless.Data.of("Place")
      .findFirst({ where: `name = '${placeName}'` })
      .then((place) => {
        if (!place) {
          showInfo("Place not found.");
        }

        return Backendless.Data.of("Place_Likes")
          .findFirst({
            where: `placeId = '${place.objectId}' AND likedById = '${currentUser.objectId}'`,
          })
          .then((existingLike) => {
            if (existingLike) {
              showInfo("You have already liked this place.");
            }

            return Backendless.Data.of("Place")
              .findFirst({
                where: `name = '${placeName}'`,
              })
              .then((placeOwner) => {
                const like = {
                  placeId: place.objectId,
                  likedById: currentUser.objectId,
                  postedById: placeOwner.ownerId,
                };

                return Backendless.Data.of("Place_Likes").save(like);
              });
          });
      })
      .then(() => showInfo("Place liked successfully"))
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
        properties: ["placeId"], // Получаем только идентификаторы мест
      })
      .then((likes) => {
        if (likes.length === 0) {
          showInfo("You have not liked any places yet.");
          return [];
        }

        // Получаем список уникальных placeId
        const placeIds = likes.map((like) => `'${like.placeId}'`).join(",");
        console.log(`Place IDs: ${placeIds}`); // Лог для проверки

        return Backendless.Data.of("Place").find({
          condition: `objectId IN (${placeIds})`, // Условие для поиска мест
          properties: ["name", "description", "photo"], // Добавляем необходимые свойства
        });
      })
      .then((places) => {
        if (!places || places.length === 0) {
          showInfo("No liked places found.");
          return;
        }

        // Генерация HTML для отображения мест
        const placesHtml = places
          .map(
            (place) => `
            <div class="col-4 mb-3">
              <div class="card">
                <img src="${place.photo || "placeholder.jpg"}" 
                     class="card-img-top" 
                     alt="${place.name || "Place photo"}" 
                     style="height: 150px; object-fit: cover;">
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

        // Вставляем HTML в контейнер
        const container = document.getElementById("liked-places-container");
        container.innerHTML = `<div class="row">${placesHtml}</div>`;
      })
      .catch(onError);
  }

  // function viewLikedPlaces() {
  //   if (!currentUser) {
  //     showInfo("Please login first");
  //     return;
  //   }

  //   Backendless.Data.of("Place_Likes")
  //     .find({
  //       condition: `likedById = '${currentUser.objectId}'`,
  //       properties: ["placeId"], // Получаем только идентификаторы мест
  //     })
  //     .then((likes) => {
  //       if (likes.length === 0) {
  //         showInfo("You have not liked any places yet.");
  //         return;
  //       }

  //       // Получаем список уникальных placeId
  //       const placeIds = likes.map((like) => `'${like.placeId}'`).join(",");
  //       return Backendless.Data.of("Place").find({
  //         condition: `objectId IN (${placeIds})`, // Условие для поиска мест
  //         properties: ["name", "description", "photo"], // Добавляем необходимые свойства
  //       });
  //     })
  //     .then((places) => {
  //       if (!places || places.length === 0) {
  //         showInfo("No liked places found.");
  //         return;
  //       }

  //       // Генерация HTML для отображения мест
  //       const placesHtml = places
  //         .map(
  //           (place) => `
  //           <div class="col-4 mb-3">
  //             <div class="card">
  //               <img src="${place.photo || "placeholder.jpg"}"
  //                    class="card-img-top"
  //                    alt="${place.name || "Place photo"}"
  //                    style="height: 150px; object-fit: cover;">
  //               <div class="card-body text-center">
  //                 <h5 class="card-title">${place.name}</h5>
  //                 <p class="card-text">${
  //                   place.description || "No description available"
  //                 }</p>
  //               </div>
  //             </div>
  //           </div>
  //           <hr>
  //         `
  //         )
  //         .join("");

  //       // Вставляем HTML в контейнер
  //       const container = document.getElementById("liked-places-container");
  //       container.innerHTML = `<div class="row">${placesHtml}</div>`;
  //     })
  //     .catch(onError);
  // }

  function viewMyPlaces() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    Backendless.Data.of("Place")
      .find({
        condition: `ownerId = '${currentUser.objectId}'`,
        properties: ["name", "description", "photo"],
      })
      .then((places) => {
        if (!places || places.length === 0) {
          showInfo("You have not added any places yet.");
          return;
        }

        const placesHtml = places
          .map(
            (place) => `
            <div class="col-4 mb-3">
              <div class="card">
                <img src="${place.photo || "placeholder.jpg"}"
                      class="card-img-top"
                      alt="${place.name || "Place photo"}"
                      style="height: 150px; object-fit: cover;">
                <div class="card-body text-center">
                  <h5 class="card-title
                  ">${place.name}</h5>
                  <p class="card-text">${
                    place.description || "No description available"
                  }</p>
                </div>
              </div>
            </div>
            <hr>
          `
          )
          .join("");

        const container = document.getElementById("my-places-container");
        container.innerHTML = `<div class="row">${placesHtml}</div>`;
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

        const viewPlace = document.getElementById("view-place-on-map-btn");
        var mapContainer = document.getElementById("map-container");

        var iframe = document.createElement("iframe");
        iframe.src = mapUrl;
        iframe.loading = "lazy";
        iframe.allowFullscreen = true;

        mapContainer.appendChild(iframe);
        mapContainer.style.display = "block";

        viewPlace.disabled = true;
      })
      .catch(onError);
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

  function updateProfilePhoto() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    var path = `users/${currentUser.objectId}/profile-photos`;
    Backendless.Files.listing(path)
      .then((files) => {
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
      })
      .catch(onError);
  }

  function saveSelectedAvatar() {
    var selectedPhoto = document.querySelector(
      'input[name="avatar"]:checked'
    )?.value;
    if (!selectedPhoto) {
      showInfo("Please select a photo first.");
      return;
    }

    currentUser.profilePhoto = selectedPhoto;

    Backendless.UserService.update(currentUser)
      .then((updatedUser) => {
        currentUser = updatedUser;
        document.getElementById("profile-avatar").src =
          currentUser.profilePhoto;
        document.getElementById("avatar-selection-modal").style.display =
          "none";
        showInfo("Profile photo updated successfully.");
      })
      .catch(onError);
  }

  function updateAvatarDisplay() {
    var avatarUrl = currentUser.profilePhoto || "/placeholder-avatar.png";
    document.getElementById("profile-avatar").src = avatarUrl;
  }

  function logout() {
    Backendless.UserService.logout()
      .then(() => {
        currentUser = null;
        window.location.href = "../auth/auth.html";
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
