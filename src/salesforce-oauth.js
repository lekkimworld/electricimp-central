const fetch = require("node-fetch");
const FormData = require("form-data");

module.exports = () => {
    // create form data
    const formdata = new FormData();
    formdata.append("grant_type", "client_credentials");
    formdata.append("client_id", process.env.SF_CLIENT_ID);
    formdata.append("client_secret", process.env.SF_CLIENT_SECRET);

    // login
    return fetch(`https://${process.env.SF_LOGIN_URL || "login.salesforce.com"}/services/oauth2/token`, {
        method: "post",
        body: formdata,
    })
        .then((res) => res.json())
        .then((data) => {
            // return
            if (data.error) {
                console.log(`ERROR - unable to perform auth to Salesforce`, data);
                return Promise.reject(Error(data.error_description));
            }
            return Promise.resolve(data);
        });
};
