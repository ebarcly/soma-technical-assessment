import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface TodoWithDependencies {
  id: number;
  title: string;
  estimatedDuration: number | null;
  dependencies: {
    dependsOn: { id: number; title: string; estimatedDuration: number | null };
  }[];
}

function calculateCriticalPath(todos: TodoWithDependencies[]) {
  const todoMap = new Map(todos.map((todo) => [todo.id, todo]));
  const visited = new Set<number>();
  const earliestStart = new Map<number, number>();
  const criticalPath: number[] = [];

  // Topological sort with critical path calculation
  function visit(todoId: number): number {
    if (visited.has(todoId)) {
      return earliestStart.get(todoId) || 0;
    }

    visited.add(todoId);
    const todo = todoMap.get(todoId);
    if (!todo) return 0;

    let maxDependencyEnd = 0;
    let criticalDependency: number | null = null;

    for (const dep of todo.dependencies) {
      const depEndTime =
        visit(dep.dependsOn.id) + (dep.dependsOn.estimatedDuration || 1);
      if (depEndTime > maxDependencyEnd) {
        maxDependencyEnd = depEndTime;
        criticalDependency = dep.dependsOn.id;
      }
    }

    earliestStart.set(todoId, maxDependencyEnd);

    // If this todo is on the critical path, add it
    if (
      criticalDependency !== null &&
      criticalPath.includes(criticalDependency)
    ) {
      criticalPath.push(todoId);
    } else if (todo.dependencies.length === 0) {
      // This is a root task, start of a potential critical path
      criticalPath.push(todoId);
    }

    return maxDependencyEnd;
  }

  // Calculate for all todos
  todos.forEach((todo) => visit(todo.id));

  // Find the actual critical path (longest path)
  let longestPath: number[] = [];
  let longestDuration = 0;

  function findLongestPath(
    todoId: number,
    currentPath: number[],
    currentDuration: number
  ) {
    const todo = todoMap.get(todoId);
    if (!todo) return;

    const newPath = [...currentPath, todoId];
    const newDuration = currentDuration + (todo.estimatedDuration || 1);

    // Check if this todo has no dependents (is a leaf)
    const hasDependents = todos.some((t) =>
      t.dependencies.some((d) => d.dependsOn.id === todoId)
    );

    if (!hasDependents) {
      if (newDuration > longestDuration) {
        longestDuration = newDuration;
        longestPath = newPath;
      }
      return;
    }

    // Continue to dependents
    todos.forEach((t) => {
      if (t.dependencies.some((d) => d.dependsOn.id === todoId)) {
        findLongestPath(t.id, newPath, newDuration);
      }
    });
  }

  // Start from all root tasks (tasks with no dependencies)
  const rootTasks = todos.filter((todo) => todo.dependencies.length === 0);
  rootTasks.forEach((root) => {
    findLongestPath(root.id, [], 0);
  });

  return {
    criticalPath: longestPath,
    earliestStartTimes: Array.from(earliestStart.entries()).map(
      ([id, start]) => ({
        id,
        earliestStart: start,
      })
    ),
    totalDuration: longestDuration,
  };
}

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        dependencies: {
          include: {
            dependsOn: {
              select: {
                id: true,
                title: true,
                estimatedDuration: true,
              },
            },
          },
        },
      },
    });

    const result = calculateCriticalPath(todos);

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error calculating critical path:", error);
    return NextResponse.json(
      { error: "Error calculating critical path" },
      { status: 500 }
    );
  }
}
