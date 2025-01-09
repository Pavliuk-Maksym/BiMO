"use strict";

/**
 * @typedef {string} WKT
 * @description A string in the Well-Known Text (WKT) format representing a geometric point.
 * @example "POINT (longitude latitude)"
 */

/**
 * @typedef {Object} Place
 * @property {String} photo - URL or path to the photo of the place (max length: 250).
 * @property {String} category - The category of the place (max length: 250).
 * @property {String} description - A short description of the place (max length: 250).
 * @property {String} hashtags - A string of hashtags associated with the place (max length: 250).
 * @property {WKT} location - The geographical location of the place, represented as WKT, GeoJSON, or Point.
 * @property {String} name - The name of the place (max length: 250).
 * @property {String} objectId - The unique identifier for the place (max length: 36).
 */

class BiMO_API_Service {
  /**
   * @param {String} placeId
   * @returns {Promise<Place>}
   */
  getPlace(placeId) {
    return Backendless.Data.of("Place")
      .findById(placeId)
      .then((place) => {
        console.log("Place:", place);
        return place;
      })
      .catch((error) => {
        console.error("Error getting a place:", error);
        throw error;
      });
  }

  /**
   * @param {Place} place
   */
  addPlace(place) {
    return Backendless.Data.of("Place")
      .save(place)
      .then((savedPlace) => {
        console.log("Place added:", savedPlace);
        return savedPlace;
      })
      .catch((error) => {
        console.error("Error adding place:", error);
        throw error;
      });
  }

  /**
   * @param {Place} place
   */
  updatePlace(place) {
    if (!place.objectId) {
      throw new Error("objectId is required to update a place.");
    }

    return Backendless.Data.of("Place")
      .save(place)
      .then((updatedPlace) => {
        console.log("Place updated:", updatedPlace);
        return updatedPlace;
      })
      .catch((error) => {
        console.error("Error updating place:", error);
        throw error;
      });
  }

  /**
   * @param {String} placeId
   */
  deletePlace(placeId) {
    return Backendless.Data.of("Place")
      .remove(placeId)
      .then(() => {
        console.log(`Place with ID ${placeId} deleted.`);
      })
      .catch((error) => {
        console.error("Error deleting place:", error);
        throw error;
      });
  }
}

Backendless.ServerCode.addService(BiMO_API_Service, []);
