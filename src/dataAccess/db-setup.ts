import * as mongodb from 'mongodb';
import * as chalk from 'chalk';
import * as contracts from './contracts';

async function setupNewDatabase(mongoUrl: string, initialAdmin: contracts.IInitialAdmin) {
    let db = await mongodb.MongoClient.connect(mongoUrl);
    let participants = db.collection("participants");
    let admin = await participants.find({ isAdmin: true }).limit(1).toArray();
    if (!admin.length) {
        // No admin in DB -> create initial admin
        await participants.insertOne({
            givenName: initialAdmin.givenName,
            familyName: initialAdmin.familyName,
            email: initialAdmin.email,
            googleSubject: initialAdmin.googleSubject,
            roles: {
                isAdmin: true
            }
        });
        console.log("No admin existed, created one.");
    } else {
        console.log(chalk.red("DB already configured"))
        throw "DB already configured";
    }
}

export default setupNewDatabase;