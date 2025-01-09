/**
 * @param {Object} req The request object contains information about the request
 * @param {Object} req.context The execution context contains an information about application, current user and event
 *
 * @param {Object} res The response object
 * @param {Object} res.result Execution Result
 * @param {Object} res.error
 *
 * @returns {Object|Promise.<Object>|void} By returning a value you overwrite server's result
 */
Backendless.ServerCode.User.afterLogout(async function (req, res) {
  console.log("Trying to process handler for user login");

  await Backendless.Data.of("Statistic")
    .findFirst()
    .then((record) => {
      if (!record) {
        throw new Error("No record found in the Statistics table.");
      }

      record.online = Math.max((record.online || 0) - 1, 0);

      return Backendless.Data.of("Statistic").save(record);
    })
    .then((updatedRecord) => {
      console.log("Record online decreased!");
    })
    .catch((error) => {
      console.log("Error decrementing online count:", error);
    });
});
