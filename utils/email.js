require("dotenv").config();
const sgMail = require("@sendgrid/mail");

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

const SENDGRID_EMAIL = process.env.SENDGRID_EMAIL;

const sendMail = async (msg) => {
    try {
        const info = await sgMail.send(msg);
        return info;
    } catch (error) {
        console.log(error);

        if (error.response) {
            console.log(error.response.body);
        }
        throw error;
    }
};

module.exports = {
    SENDGRID_EMAIL,
    sendMail,
};