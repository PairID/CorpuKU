export const sendEmail = async ({
    to,
    subject,
    text,
    html,
}: {
    to: string;
    subject: string;
    text: string;
    html?: string;
}) => {
    // Dynamically import nodemailer to ensure it only runs on server
    const nodemailer = await import("nodemailer");

    const transporter = nodemailer.createTransport({
        host: process.env.SMTP_HOST,
        port: parseInt(process.env.SMTP_PORT || "587"),
        secure: process.env.SMTP_PORT === "465", 
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS,
        },
    });

    try {
        await transporter.sendMail({
            from: process.env.SMTP_FROM,
            to,
            subject,
            text,
            html,
        });
        return { success: true };
    } catch (error) {
        console.error("Failed to send email:", error);
        return { success: false, error };
    }
};
