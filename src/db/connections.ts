import mongoose from 'mongoose';

interface MongooseConnection {
    conn: typeof mongoose | null;
    promise: Promise<typeof mongoose> | null;
}

declare global {
    var mongoose:   MongooseConnection | undefined;
}

const MONGODB_URI= process.env.MONGODB_URI!;

if (!MONGODB_URI){
    throw new Error('Please define the MONGODB_URI environment variable');
}

let cached: MongooseConnection = global.mongoose || {conn: null, promise: null};

if (process.env.NODE_ENV === 'development'){
    if (!global.mongoose){
        global.mongoose = {conn: null, promise: null};
    }
    cached = global.mongoose;
}

async function dbConnect(){
    if (cached.conn){
        return cached.conn;
    }
    if (!cached.promise){
        const opts = {bufferCommands: false,};
        cached.promise = mongoose.connect(MONGODB_URI, opts).then((mongoose) => {return mongoose;});
    }
    
    try {
        cached.conn = await cached.promise;
    } catch (e){
        cached.promise = null;
        throw e;
    }
    return cached.conn;
} 
export default dbConnect;