import dotenv from "dotenv"
import app from "./app";

dotenv.config()

const PORT = Number(process.env.PORT!) || 7321

Error.stackTraceLimit = Infinity;


process.on('SIGINT', () => process.exit())

process.on('SIGTERM', () => process.exit())

app.listen(PORT, () => console.log(`Listening on port ${PORT}`))