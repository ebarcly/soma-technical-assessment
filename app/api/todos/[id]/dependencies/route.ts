import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

interface Params {
  params: {
    id: string;
  };
}

async function hasCircularDependency(
  todoId: number,
  dependsOnId: number
): Promise<boolean> {
  if (todoId === dependsOnId) return true;

  const visited = new Set<number>();
  const stack = [dependsOnId];

  while (stack.length > 0) {
    const currentId = stack.pop()!;
    if (visited.has(currentId)) continue;
    if (currentId === todoId) return true;

    visited.add(currentId);

    const dependencies = await prisma.todoDependency.findMany({
      where: { todoId: currentId },
      select: { dependsOnId: true },
    });

    for (const dep of dependencies) {
      stack.push(dep.dependsOnId);
    }
  }

  return false;
}

export async function POST(request: Request, { params }: Params) {
  const todoId = parseInt(params.id);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  try {
    const { dependsOnId } = await request.json();

    if (!dependsOnId || isNaN(parseInt(dependsOnId))) {
      return NextResponse.json(
        { error: "Valid dependency ID is required" },
        { status: 400 }
      );
    }

    const dependsOnIdInt = parseInt(dependsOnId);

    // Check if both todos exist
    const [todo, dependsOnTodo] = await Promise.all([
      prisma.todo.findUnique({ where: { id: todoId } }),
      prisma.todo.findUnique({ where: { id: dependsOnIdInt } }),
    ]);

    if (!todo || !dependsOnTodo) {
      return NextResponse.json(
        { error: "One or both todos not found" },
        { status: 404 }
      );
    }

    // Check for circular dependencies
    const hasCircular = await hasCircularDependency(todoId, dependsOnIdInt);
    if (hasCircular) {
      return NextResponse.json(
        {
          error: "This would create a circular dependency",
        },
        { status: 400 }
      );
    }

    // Create the dependency
    const dependency = await prisma.todoDependency.create({
      data: {
        todoId,
        dependsOnId: dependsOnIdInt,
      },
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error("Error creating dependency:", error);
    if ((error as any).code === "P2002") {
      return NextResponse.json(
        { error: "Dependency already exists" },
        { status: 409 }
      );
    }
    return NextResponse.json(
      { error: "Error creating dependency" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: Request, { params }: Params) {
  const todoId = parseInt(params.id);
  if (isNaN(todoId)) {
    return NextResponse.json({ error: "Invalid todo ID" }, { status: 400 });
  }

  try {
    const { dependsOnId } = await request.json();

    if (!dependsOnId || isNaN(parseInt(dependsOnId))) {
      return NextResponse.json(
        { error: "Valid dependency ID is required" },
        { status: 400 }
      );
    }

    const dependsOnIdInt = parseInt(dependsOnId);

    await prisma.todoDependency.deleteMany({
      where: {
        todoId,
        dependsOnId: dependsOnIdInt,
      },
    });

    return NextResponse.json(
      { message: "Dependency removed" },
      { status: 200 }
    );
  } catch (error) {
    console.error("Error removing dependency:", error);
    return NextResponse.json(
      { error: "Error removing dependency" },
      { status: 500 }
    );
  }
}
