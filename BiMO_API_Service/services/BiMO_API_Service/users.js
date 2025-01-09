"use strict";

/**
 * @typedef {string} WKT
 * @description A string in the Well-Known Text (WKT) format representing a geometric point.
 * @example "POINT (longitude latitude)"
 */

/**
 * @typedef {Object} User
 * @property {String} profilePhoto - URL or path to the user's profile photo (max length: 250).
 * @property {Number} age - The age of the user (integer).
 * @property {String} country - The country of the user (max length: 250).
 * @property {String} email - The email of the user (max length: 250).
 * @property {String} gender - The gender of the user (max length: 250).
 * @property {WKT} myLocation - The geographical location of the user, represented as WKT, GeoJSON, or Point.
 * @property {String} name - The name of the user (max length: 250).
 * @property {Date} lastLogin - The last login time of the user.
 * @property {String} socialAccount - The social account information of the user (e.g., Facebook, Google).
 * @property {String} userStatus - The status of the user (e.g., active, suspended).
 * @property {String} blUserLocale - The locale of the user (max length: 250).
 * @property {Object} oAuthIdentities - The OAuth identities for the user (JSON format).
 * @property {String} accountType - The account type (e.g., regular, admin).
 * @property {String} password - The user's password (max length: 250).
 * @property {String} objectId - The unique identifier for the user (max length: 36).
 * @property {String} ownerId - The owner ID (max length: 36).
 * @property {Date} created - The date when the user was created.
 * @property {Date} updated - The date when the user was last updated.
 * @property {Array<User>} friends - The list of friends of the user (relation to other `User` objects).
 */

class User_API_Service {
  /**
   * @param {String} userId
   * @returns {Promise<User>}
   */
  getUser(userId) {
    return Backendless.Data.of("Users")
      .findById(userId)
      .then((user) => {
        console.log("User:", user);
        return user;
      })
      .catch((error) => {
        console.error("Error getting user:", error);
        throw error;
      });
  }

  /**
   * @param {User} user
   */
  addUser(user) {
    return Backendless.Data.of("Users")
      .save(user)
      .then((savedUser) => {
        console.log("User added:", savedUser);
        return savedUser;
      })
      .catch((error) => {
        console.error("Error adding user:", error);
        throw error;
      });
  }

  /**
   * @param {User} user
   */
  updateUser(user) {
    if (!user.objectId) {
      throw new Error("objectId is required to update a user.");
    }

    return Backendless.Data.of("Users")
      .save(user)
      .then((updatedUser) => {
        console.log("User updated:", updatedUser);
        return updatedUser;
      })
      .catch((error) => {
        console.error("Error updating user:", error);
        throw error;
      });
  }

  /**
   * @param {String} userId
   */
  deleteUser(userId) {
    return Backendless.Data.of("Users")
      .remove(userId)
      .then(() => {
        console.log(`User with ID ${userId} deleted.`);
      })
      .catch((error) => {
        console.error("Error deleting user:", error);
        throw error;
      });
  }

  /**
   * @param {String} userId
   * @param {Array<String>} friendIds - List of userIds to add as friends.
   */
  addFriends(userId, friendIds) {
    return Backendless.Data.of("Users")
      .findById(userId)
      .then((user) => {
        const friendsRelation = Backendless.Data.of("Users").relation(
          user.objectId,
          "friends"
        );
        return friendsRelation.add(friendIds).then(() => {
          console.log(`Friends added for user with ID ${userId}`);
          return user;
        });
      })
      .catch((error) => {
        console.error("Error adding friends:", error);
        throw error;
      });
  }

  /**
   * @param {String} userId
   * @param {Array<String>} friendIds - List of userIds to remove from friends.
   */
  removeFriends(userId, friendIds) {
    return Backendless.Data.of("Users")
      .findById(userId)
      .then((user) => {
        const friendsRelation = Backendless.Data.of("Users").relation(
          user.objectId,
          "friends"
        );
        return friendsRelation.remove(friendIds).then(() => {
          console.log(`Friends removed for user with ID ${userId}`);
          return user;
        });
      })
      .catch((error) => {
        console.error("Error removing friends:", error);
        throw error;
      });
  }

  /**
   * @param {String} userId
   * @returns {Promise<Array<User>>}
   */
  getFriends(userId) {
    return Backendless.Data.of("Users")
      .findById(userId)
      .then((user) => {
        const friendsRelation = Backendless.Data.of("Users").relation(
          user.objectId,
          "friends"
        );
        return friendsRelation.get().then((friends) => {
          console.log("Friends list:", friends);
          return friends;
        });
      })
      .catch((error) => {
        console.error("Error getting friends:", error);
        throw error;
      });
  }
}

Backendless.ServerCode.addService(User_API_Service, []);
