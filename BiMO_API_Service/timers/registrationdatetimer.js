/**
 * RegistrationDateTimer timer.
 * It is executed according to the schedule
 */
Backendless.ServerCode.addTimer({
  name: "RegistrationDateTimer",

  startDate: 1736316000000,
  frequency: {
    schedule: "custom",
    repeat: {
      every: 86400,
    },
  },

  /**
   * @param {Object} req
   * @param {String} req.context Application Version Id
   */
  async execute(req) {
    try {
      const users = await Backendless.Data.of("Users").find();
      console.log("Processing registration date timer...");

      if (users.length === 0) {
        console.log("No users found in the database.");
        return;
      }

      const today = new Date();
      const todayYear = today.getFullYear();
      const todayMonth = today.getMonth();
      const todayDate = today.getDate();

      const matchingUsers = users.filter((user) => {
        const registrationDate = new Date(user.created);

        const registrationYear = registrationDate.getFullYear();
        const registrationMonth = registrationDate.getMonth();
        const registrationDateDay = registrationDate.getDate();

        const isOneYearPassed =
          todayYear - registrationYear === 1 &&
          todayMonth === registrationMonth &&
          todayDate === registrationDateDay;

        return isOneYearPassed;
      });

      if (matchingUsers.length > 0) {
        console.log("Users who have anniversary today:");
        matchingUsers.forEach((user) => {
          console.log(`- ${user.name} (Email: ${user.email})`);

          var bodyParts = new Backendless.Bodyparts();
          bodyParts.textmessage = `Hello, ${user.name}. Congratulations!\n\nToday is the day you registered on our app!`;

          var recipient = [user.email];
          var subject = "Congratulations!";
          var attachment = null;

          Backendless.Messaging.sendEmail(
            subject,
            bodyParts,
            recipient,
            attachment
          )
            .then(() => {
              console.log(`Anniversary email sent to: ${user.email}`);
            })
            .catch((error) => {
              console.error("Error sending email:", error);
            });
        });
      } else {
        console.log("No users with anniversary today.");
      }
    } catch (error) {
      console.log("Error fetching users:", error);
    }
  },
});
