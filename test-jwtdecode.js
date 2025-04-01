const { jwtDecode } = require("jwt-decode");

const token = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJkMTY1OWNiNy0yYmQ1LTQzNWUtOWMxYi04ZjdkNzhiZTM1MTYiLCJ1c2VybmFtZSI6InRob21hcy5zYWlsbGFyZCIsImlhdCI6MTc0MDY3NTYwMCwiZXhwIjoxNzQxMjgwNDAwfQ.TtGpXqlfgJxUxwWcKidVb1PNRRt_SktUXBwaG9Zyb9U";
const decoded = jwtDecode(token);

console.log(decoded);