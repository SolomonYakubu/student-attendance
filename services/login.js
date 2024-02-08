const username = "admin";
const pass = "admin";

const login = async (event, arg) => {
  const { name, password } = arg;
  if (name === username && password === pass) {
    return event.sender.send("login-res", {
      status: "success",
    });
  }
  return event.sender.send("login-res", {
    error: true,
    status: "incorrect login",
  });
};

module.exports = { login };
