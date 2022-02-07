import { ApolloServer } from "apollo-server-express";
import connectRedis from "connect-redis";
import cors from "cors";
import "dotenv-safe/config"; //takes vars in .env and makes them environment variables
import express from "express";
import session from "express-session";
import Redis from "ioredis";
import path from "path";
import { buildSchema } from "type-graphql";
import { createConnection } from "typeorm";
import { COOKIE_NAME, __prod__ } from "./constants";
import { HelloResolver } from "./resolvers/hello";

const main = async () => {
    //create db connection for typeorm
    await createConnection({
        type: "postgres",
        url: process.env.DATABASE_URL,
        logging: true,
        // synchronize: true, //create the tables automatically without running a migration (good for development)
        migrations: [path.join(__dirname, "./migrations/*")],
        entities: [], //MAKE SURE TO ADD ANY NEW ENTITIES HERE
    });

    //create an instance of express
    const app = express();

    //initialize the redis session (for saving browser cookies and stuff so user can stay logged in after refreshing the page)
    //this needs to come before apollo middle ware b/c we're going to be using this inside of apollo
    const RedisStore = connectRedis(session);
    const redis = new Redis(process.env.REDIS_URL);

    //tell express we have a proxy sitting in front so cookies and sessions work
    app.set("trust proxy", 1);

    //apply cors middleware to all routes (pages)
    app.use(
        cors({
            origin: [
                process.env.CORS_ORIGIN,
                "https://studio.apollographql.com",
            ],
            methods: ["GET", "POST"],
            credentials: true,
        })
    );

    //create the express session
    const sessionMiddleware = session({
        name: COOKIE_NAME,
        store: new RedisStore({
            client: redis,
            disableTTL: true,
            disableTouch: true, //disables lifecylce of cookies so they last forever
        }),
        cookie: {
            maxAge: 1000 * 60 * 60 * 24 * 365 * 10, //10 years
            httpOnly: true, //make sure cookie only available on serverside
            sameSite: "lax", //protect csrf
            secure: __prod__, //cookie only works in https
            domain: __prod__ ? ".kylegodly.com" : undefined, //need to add domain b/c sometimes server doesn't always forward cookie correctly
        },
        saveUninitialized: false,
        secret: process.env.SESSION_SECRET,
        resave: false, //makes sure not continuing to ping redis
    });

    app.use(sessionMiddleware);

    const apolloServer = new ApolloServer({
        schema: await buildSchema({
            resolvers: [HelloResolver],
            validate: false,
        }),

        //make the orm object available to all resolvers
        context: ({ req, res }) => ({
            req,
            res,
            redis,
        }),
    });

    //creates graphql endpoint for us on express
    await apolloServer.start();
    apolloServer.applyMiddleware({
        app,
        cors: false,
    });

    //start the server
    app.listen(parseInt(process.env.PORT), () => {
        console.log("FTS-test server started on localhost:" + process.env.PORT);
    });
};

main().catch((err) => {
    console.error(err);
});
