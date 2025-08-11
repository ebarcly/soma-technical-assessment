-- Add new columns
ALTER TABLE "Todo" ADD COLUMN "dueDate" DATETIME;
ALTER TABLE "Todo" ADD COLUMN "imageUrl" TEXT;
ALTER TABLE "Todo" ADD COLUMN "imageAlt" TEXT;
ALTER TABLE "Todo" ADD COLUMN "estimatedDuration" INTEGER;

-- Create TodoDependency table
CREATE TABLE "TodoDependency" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "todoId" INTEGER NOT NULL,
    "dependsOnId" INTEGER NOT NULL,
    FOREIGN KEY ("todoId") REFERENCES "Todo" ("id") ON DELETE CASCADE,
    FOREIGN KEY ("dependsOnId") REFERENCES "Todo" ("id") ON DELETE CASCADE
);

-- Create unique index to prevent duplicate
CREATE UNIQUE INDEX "TodoDependency_todoId_dependsOnId_key" ON "TodoDependency"("todoId", "dependsOnId");
