const dbConnect = require("../utils/connectDB");
const path = require("path");
const fs = require("fs");

/**
 * Find a user by their matric number to check registration status
 */
const findUserByMatric = async (event, matricNumber) => {
  console.log(`Finding user with matric number: ${matricNumber}`);

  try {
    const db = await dbConnect();
    const data = await db.read();

    // Find the user by matric number
    const user = data.users.find(
      (user) => user.matric.toLowerCase() === matricNumber.toLowerCase()
    );

    if (user) {
      console.log(`Found user: ${user.name}, ID: ${user.id}`);
      console.log(
        `Registration status - Photo: ${user.dp ? "Yes" : "No"}, Fingerprint: ${
          user.scanned ? "Yes" : "No"
        }`
      );

      event.sender.send("message", {
        type: "findUser",
        user: user,
        success: true,
      });
    } else {
      console.log(`No user found with matric number: ${matricNumber}`);
      event.sender.send("message", {
        type: "findUser",
        error: "No student found with this matric number",
        success: false,
      });
    }

    await db.close();
  } catch (error) {
    console.error("Error finding user:", error);
    event.sender.send("message", {
      type: "findUser",
      error: `Error searching for student: ${error.message}`,
      success: false,
    });
  }
};

/**
 * Update registration status for a user
 * This function is used to mark steps as complete
 */
const updateRegistrationStatus = async (event, userId, updates) => {
  console.log(`Updating registration status for user ${userId}:`, updates);

  try {
    const db = await dbConnect();

    // Get the current user data
    const user = await db.getUser(userId);

    if (!user) {
      console.log(`No user found with ID: ${userId}`);
      event.sender.send("message", {
        type: "updateRegistration",
        error: "User not found",
        success: false,
      });
      await db.close();
      return;
    }

    // Update the user data
    const result = await db.updateUser(userId, updates);

    if (result) {
      console.log(`Successfully updated registration status for ${user.name}`);
      event.sender.send("message", {
        type: "updateRegistration",
        success: true,
      });
    } else {
      console.log(`Failed to update registration for ${user.name}`);
      event.sender.send("message", {
        type: "updateRegistration",
        error: "Failed to update registration",
        success: false,
      });
    }

    await db.close();
  } catch (error) {
    console.error("Error updating registration status:", error);
    event.sender.send("message", {
      type: "updateRegistration",
      error: `Error updating registration: ${error.message}`,
      success: false,
    });
  }
};

// Check if a user has completed all registration steps
const checkRegistrationComplete = async (event, userId) => {
  console.log(`Checking registration completion for user ${userId}`);

  try {
    const db = await dbConnect();
    const user = await db.getUser(userId);

    if (!user) {
      event.sender.send("message", {
        type: "registrationStatus",
        error: "User not found",
        success: false,
      });
      await db.close();
      return;
    }

    const isComplete = user.dp && user.scanned;
    const missingSteps = [];

    if (!user.dp) missingSteps.push("profile photo");
    if (!user.scanned) missingSteps.push("fingerprint enrollment");

    console.log(
      `Registration status for ${user.name}: ${
        isComplete ? "Complete" : "Incomplete"
      }`
    );
    if (!isComplete) {
      console.log(`Missing steps: ${missingSteps.join(", ")}`);
    }

    event.sender.send("message", {
      type: "registrationStatus",
      success: true,
      isComplete: isComplete,
      missingSteps: missingSteps,
      user: user,
    });

    await db.close();
  } catch (error) {
    console.error("Error checking registration status:", error);
    event.sender.send("message", {
      type: "registrationStatus",
      error: `Error checking registration: ${error.message}`,
      success: false,
    });
  }
};

module.exports = {
  findUserByMatric,
  updateRegistrationStatus,
  checkRegistrationComplete,
};
