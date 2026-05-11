exports.sendSMS = async (phone, message) => {
    try {
      // 🔥 MOCK SMS (development mode)
      console.log("SMS SENDING...");
      console.log("TO:", phone);
      console.log("MESSAGE:", message);
  
      // later we replace with real API
  
      return {
        success: true,
        message: "SMS sent (mock mode)",
      };
  
    } catch (error) {
      console.log("SMS ERROR:", error);
    }
  };