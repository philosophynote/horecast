-- Create HorseMaster table
CREATE TABLE IF NOT EXISTS "HorseMaster" (
    id SERIAL PRIMARY KEY,
    netkeiba_horse_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create JockeyMaster table
CREATE TABLE IF NOT EXISTS "JockeyMaster" (
    id SERIAL PRIMARY KEY,
    netkeiba_jockey_id VARCHAR UNIQUE NOT NULL,
    name VARCHAR NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Race table
CREATE TABLE IF NOT EXISTS "Race" (
    id SERIAL PRIMARY KEY,
    netkeiba_race_id VARCHAR UNIQUE NOT NULL,
    track VARCHAR NOT NULL,
    number INTEGER NOT NULL,
    name VARCHAR NOT NULL,
    course_type VARCHAR NOT NULL,
    turn VARCHAR,
    distance INTEGER NOT NULL,
    race_time TIMESTAMP,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Entry table
CREATE TABLE IF NOT EXISTS "Entry" (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES "Race"(id),
    horse_master_id INTEGER NOT NULL REFERENCES "HorseMaster"(id),
    bracket_number INTEGER NOT NULL,
    horse_number INTEGER NOT NULL,
    sex VARCHAR NOT NULL,
    age INTEGER NOT NULL,
    jockey_master_id INTEGER NOT NULL REFERENCES "JockeyMaster"(id),
    jockey_weight FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    UNIQUE(race_id, horse_master_id)
);

-- Create indexes for Entry table
CREATE INDEX IF NOT EXISTS "horse_id" ON "Entry"(horse_master_id);
CREATE INDEX IF NOT EXISTS "jockey_id" ON "Entry"(jockey_master_id);

-- Create Predict table
CREATE TABLE IF NOT EXISTS "Predict" (
    id SERIAL PRIMARY KEY,
    netkeiba_race_id VARCHAR DEFAULT '' NOT NULL,
    horse_number SMALLINT NOT NULL,
    score FLOAT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP DEFAULT NOW(),
    CONSTRAINT "fk_netkeiba_race_id" FOREIGN KEY (netkeiba_race_id) 
        REFERENCES "Race"(netkeiba_race_id) ON DELETE CASCADE ON UPDATE NO ACTION
);

-- Create Result table
CREATE TABLE IF NOT EXISTS "Result" (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES "Race"(id),
    rank VARCHAR NOT NULL,
    frame_number INTEGER NOT NULL,
    horse_number INTEGER NOT NULL,
    horse_name VARCHAR NOT NULL,
    sex_name VARCHAR NOT NULL,
    favorite INTEGER,
    odds FLOAT,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create Payout table
CREATE TABLE IF NOT EXISTS "Payout" (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES "Race"(id),
    bet_type VARCHAR NOT NULL,
    numbers VARCHAR NOT NULL,
    payout INTEGER NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- Create RecommendedBet table
CREATE TABLE IF NOT EXISTS "RecommendedBet" (
    id SERIAL PRIMARY KEY,
    race_id INTEGER NOT NULL REFERENCES "Race"(id),
    bet_type VARCHAR NOT NULL,
    numbers VARCHAR NOT NULL,
    payout INTEGER DEFAULT 0 NOT NULL,
    bet INTEGER DEFAULT 100 NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);