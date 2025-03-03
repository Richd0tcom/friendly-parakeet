import { EventEmitter } from "node:stream";
import { IUser } from "./db/mongo/mongo";

const Ev = new EventEmitter()

Ev.on('add-leaderboard', (user: IUser) => {

})