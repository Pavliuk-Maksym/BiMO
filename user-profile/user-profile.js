(function (Backendless) {
  const APPLICATION_ID = "10C03549-73C1-476B-8D8F-C9313DDD8D00";
  const SECRET_KEY = "44C48D58-78FF-4558-8489-9979881887E4";
  let currentUser = null;

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
      .getElementById("delete-place-btn")
      .addEventListener("click", deletePlace);
    document
      .getElementById("search-places-btn")
      .addEventListener("click", searchPlaces);
    document
      .getElementById("like-place-btn")
      .addEventListener("click", likePlace);
    document
      .getElementById("view-place-on-map-btn")
      .addEventListener("click", viewPlaceOnMap);
    document
      .getElementById("update-profile-photo-btn")
      .addEventListener("click", updateProfilePhoto);
    document
      .getElementById("save-avatar-btn")
      .addEventListener("click", saveSelectedAvatar);
  }

  function initCurrentUser() {
    Backendless.UserService.getCurrentUser()
      .then((user) => {
        if (!user) {
          alert("Please login first");
          return;
        }
        currentUser = user;
        console.log("Current user:", currentUser);
      })
      .catch((error) => {
        alert("Error retrieving current user");
        console.error(error);
      });
  }

  function initProfilePhotoHandlers() {
    // Обработчик для кнопки загрузки нового фото
    const updateProfilePhotoBtn = document.getElementById(
      "update-profile-photo-btn"
    );
    const profilePhotoInput = document.getElementById("profile-photo-input");
    const chooseExistingPhotoBtn = document.getElementById(
      "choose-existing-photo-btn"
    );
    const saveAvatarBtn = document.getElementById("save-avatar-btn");

    // Обработчик для кнопки загрузки нового фото
    updateProfilePhotoBtn.addEventListener("click", function () {
      profilePhotoInput.click();
    });

    // Обработчик изменения файла
    profilePhotoInput.addEventListener("change", handleProfilePhotoUpload);

    // Обработчик для выбора существующего фото
    chooseExistingPhotoBtn.addEventListener("click", showExistingPhotos);

    // Обработчик сохранения выбранного фото
    saveAvatarBtn.addEventListener("click", saveSelectedPhoto);
  }

  function updateProfile() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    oldUserName = currentUser.name;

    // Get values from input fields
    const name = document.getElementById("profile-name").value;
    const email = document.getElementById("profile-email").value;
    const age = document.getElementById("profile-age").value;
    const gender = document.getElementById("profile-gender").value;
    const country = document.getElementById("profile-country").value;

    // Update currentUser object
    currentUser.name = name;
    currentUser.email = email;
    currentUser.age = Number(age);
    currentUser.gender = gender;
    currentUser.country = country;

    // Update user in Backendless
    Backendless.UserService.update(currentUser)
      .then((updatedUser) => {
        currentUser = updatedUser;
        showInfo("Profile updated successfully");
      })
      .catch(onError);
  }

  let trackingInterval;
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
            const { latitude, longitude } = position.coords;
            currentUser["my location"] = {
              type: "Point",
              coordinates: [longitude, latitude],
            };
            Backendless.UserService.update(currentUser)
              .then((updatedUser) => {
                currentUser = updatedUser;
                console.log("Location updated:", currentUser["my location"]);
              })
              .catch((error) =>
                console.error("Error updating location:", error)
              );
          },
          (error) => console.error("Geolocation error:", error),
          { enableHighAccuracy: true }
        );
      }, 60000); // 60 seconds interval
    }
  }

  function addPlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const latitude = parseFloat(
      document.getElementById("place-latitude").value
    );
    const longitude = parseFloat(
      document.getElementById("place-longitude").value
    );
    const place = {
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

    Backendless.Data.of("Place")
      .save(place)
      .then((savedPlace) => {
        showInfo(`Place added successfully: ${savedPlace.objectId}`);
      })
      .catch(onError);
  }

  function deletePlace() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const placeName = document.getElementById("place-to-delete").value;

    // Теперь значение name обернуто в кавычки
    Backendless.Data.of("Place")
      .findFirst({
        where: `name = '${placeName}' AND ownerId = '${currentUser.objectId}'`, // value wrapped in single quotes
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
    const searchQuery = document.getElementById("place-search-name").value;
    const searchCategory = document.getElementById(
      "place-search-category"
    ).value;
    const radius = parseFloat(document.getElementById("search-radius").value);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;

        const whereClauses = [];
        if (searchQuery) whereClauses.push(`name LIKE '%${searchQuery}%'`); // Поиск по названию
        if (searchCategory) whereClauses.push(`category = '${searchCategory}'`);

        const queryBuilder = Backendless.DataQueryBuilder.create();
        queryBuilder.setWhereClause(whereClauses.join(" AND "));
        queryBuilder.setProperties([
          "objectId",
          "name", // Добавляем поле "name" для отображения в результатах
          "category",
          "description",
          "location", // Обрабатываем поле location
          "hashtags",
        ]);
        queryBuilder.setPageSize(20);

        Backendless.Data.of("Place")
          .find(queryBuilder)
          .then((places) => {
            const resultsContainer = document.getElementById("search-results");
            if (places.length > 0) {
              resultsContainer.innerHTML = places
                .map((place) => {
                  // Извлекаем координаты из объекта location
                  const location = place.location && place.location.coordinates;

                  // Если координаты существуют, форматируем их
                  const locationText =
                    location && location.length === 2
                      ? `${latitude}, ${longitude}` // longitude, latitude
                      : "Not available";

                  return `
                    <div>
                      <strong>${place.name}</strong><br> <!-- Отображаем название места -->
                      Category: ${place.category}<br>
                      Hashtags: ${place.hashtags}<br>
                      Location: ${locationText}
                    </div><hr>
                  `;
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
        console.error("Geolocation error:", error);
        showInfo("Failed to retrieve current location.");
      }
    );
  }

  //   function searchPlaces() {
  //     const searchQuery = document.getElementById("place-search-name").value;
  //     const searchCategory = document.getElementById(
  //       "place-search-category"
  //     ).value;
  //     const radius = parseFloat(document.getElementById("search-radius").value);

  //     navigator.geolocation.getCurrentPosition(
  //       (position) => {
  //         const latitude = position.coords.latitude;
  //         const longitude = position.coords.longitude;

  //         const whereClauses = [];
  //         if (searchQuery)
  //           whereClauses.push(`description LIKE '%${searchQuery}%'`);
  //         if (searchCategory) whereClauses.push(`category = '${searchCategory}'`);

  //         const queryBuilder = Backendless.DataQueryBuilder.create();
  //         queryBuilder.setWhereClause(whereClauses.join(" AND "));
  //         queryBuilder.setProperties([
  //           "objectId",
  //           "category",
  //           "description",
  //           "location",
  //           "hashtags",
  //         ]);
  //         queryBuilder.setPageSize(20);

  //         Backendless.Data.of("Place")
  //           .find(queryBuilder)
  //           .then((places) => {
  //             const resultsContainer = document.getElementById("search-results");
  //             if (places.length > 0) {
  //               resultsContainer.innerHTML = places
  //                 .map(
  //                   (place) => `
  //                 <div>
  //                   <strong>${place.description}</strong><br>
  //                   Category: ${place.category}<br>
  //                   Hashtags: ${place.hashtags}<br>
  //                   Location: ${
  //                     place.location?.coordinates.join(", ") || "Not available"
  //                   }
  //                 </div><hr>
  //               `
  //                 )
  //                 .join("");
  //               showInfo("Places found successfully.");
  //             } else {
  //               resultsContainer.innerHTML =
  //                 "<p>No places found matching the criteria.</p>";
  //               showInfo("No places found.");
  //             }
  //           })
  //           .catch(onError);
  //       },
  //       (error) => {
  //         console.error("Geolocation error:", error);
  //         showInfo("Failed to retrieve current location.");
  //       }
  //     );
  //   }

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
          return Promise.reject();
        }
        // Check if user has already liked the place
        return Backendless.Data.of("Place_Likes")
          .findFirst({
            where: `placeId = '${place.objectId}' AND userId = '${currentUser.objectId}'`,
          })
          .then((existingLike) => {
            if (existingLike) {
              showInfo("You have already liked this place.");
              return Promise.reject();
            }
            // Save the like
            const like = {
              placeId: place.objectId,
              userId: currentUser.objectId,
            };
            return Backendless.Data.of("Place_Likes").save(like);
          });
      })
      .then(() => showInfo("Place liked successfully"))
      .catch(onError);
  }

  function viewPlaceOnMap() {
    if (!currentUser) {
      showInfo("Please login first");
      return;
    }

    const placeName = document.getElementById("place-to-view").value;

    Backendless.Data.of("Place")
      .findFirst({ where: `name = '${placeName}'` })
      .then((place) => {
        if (place) {
          const coordinates = place.location?.coordinates;
          if (coordinates) {
            // Display map with place's location
            showInfo(
              `Showing place on map: ${
                place.name
              }. Coordinates: ${coordinates.join(", ")}`
            );
            // Additional logic to display map can be implemented here
          } else {
            showInfo("Location not available for this place.");
          }
        } else {
          showInfo("Place not found.");
        }
      })
      .catch(onError);
  }

  function saveSelectedPhoto() {
    const selectedPhotoInput = document.querySelector(
      'input[name="selected_photo"]:checked'
    );
    if (!selectedPhotoInput) {
      showInfo("Please select a photo.");
      return;
    }

    const selectedPhotoUrl = selectedPhotoInput.value;

    Backendless.UserService.update({
      objectId: currentUser.objectId,
      profilePhoto: selectedPhotoUrl,
    })
      .then((updatedUser) => {
        currentUser = updatedUser;

        // Обновляем аватар в интерфейсе
        document.getElementById("profile-avatar").src =
          currentUser.profilePhoto;

        // Закрываем модальное окно
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

    const path = `users/${currentUser.objectId}/photos/`;

    Backendless.Files.listing(path, "*", true) // Загружаем все файлы из директории
      .then((files) => {
        const imageFiles = files.filter((file) =>
          file.name.toLowerCase().match(/\.(jpg|jpeg|png|gif)$/)
        );

        const modalBody = document.querySelector(
          "#avatar-selection-modal .modal-body"
        );

        if (imageFiles.length === 0) {
          showInfo("No photos found. Please upload some photos first.");
        } else {
          const photosHtml = imageFiles
            .map(
              (file) => `
            <div class="col-4 mb-3">
              <div class="card">
                <img src="${file.fileURL}" class="card-img-top" style="height: 150px; object-fit: cover;">
                <div class="card-body text-center">
                  <input type="radio" name="selected_photo" value="${file.fileURL}" class="form-check-input">
                </div>
              </div>
            </div>
          `
            )
            .join("");

          modalBody.innerHTML = `<div class="row">${photosHtml}</div>`;
        }

        // Показываем модальное окно
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

    const file = event.target.files[0];
    if (!file) return;

    // Проверка типа файла
    if (!file.type.startsWith("image/")) {
      showInfo("Please select a valid image file.");
      return;
    }

    showInfo("Uploading profile photo...");

    // Создаем уникальный путь для файла
    const photoPath = `users/${currentUser.objectId}/photos/${Date.now()}_${
      file.name
    }`;

    // Загружаем файл
    Backendless.Files.upload(file, photoPath, true)
      .then((uploadedFile) => {
        // Обновляем профиль пользователя с новым URL фото
        return Backendless.UserService.update({
          objectId: currentUser.objectId,
          profilePhoto: uploadedFile.fileURL,
        });
      })
      .then((updatedUser) => {
        currentUser = updatedUser;

        // Обновляем аватар в интерфейсе
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

    const path = `users/${currentUser.objectId}/profile-photos`;
    Backendless.Files.listing(path)
      .then((files) => {
        const imageFiles = files.filter((file) =>
          file.name.match(/\.(jpg|jpeg|png|gif)$/i)
        );
        const modalBody = document.getElementById(
          "avatar-selection-modal-body"
        );
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
    const selectedPhoto = document.querySelector(
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
    const avatarUrl = currentUser.profilePhoto || "/placeholder-avatar.png";
    document.getElementById("profile-avatar").src = avatarUrl;
  }

  function onError(error) {
    console.error("An error occurred:", error);
    alert(error.message || "An error occurred");
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
