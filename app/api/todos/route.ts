import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const todos = await prisma.todo.findMany({
      include: {
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            todo: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    });
    return NextResponse.json(todos);
  } catch (error) {
    console.error("Error fetching todos:", error);
    return NextResponse.json(
      { error: "Error fetching todos" },
      { status: 500 }
    );
  }
}

async function fetchImageFromPexels(query: string) {
  const API_KEY = process.env.PEXELS_API_KEY;
  if (!API_KEY) {
    console.warn("PEXELS_API_KEY not found in environment variables");
    return null;
  }

  try {
    const response = await fetch(
      `https://api.pexels.com/v1/search?query=${encodeURIComponent(
        query
      )}&per_page=1&orientation=landscape`,
      {
        headers: {
          Authorization: API_KEY,
        },
      }
    );

    if (!response.ok) {
      console.error("Pexels API error:", response.status, response.statusText);
      return null;
    }

    const data = await response.json();
    if (data.photos && data.photos.length > 0) {
      const photo = data.photos[0];
      return {
        url: photo.src.medium,
        alt: photo.alt || `Image for ${query}`,
      };
    }
  } catch (error) {
    console.error("Error fetching image from Pexels:", error);
  }
  return null;
}

// detect circular dependencies
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

export async function POST(request: Request) {
  try {
    const { title, dueDate, dependencies, estimatedDuration } =
      await request.json();

    if (!title || title.trim() === "") {
      return NextResponse.json({ error: "Title is required" }, { status: 400 });
    }

    // create the todo first
    const todo = await prisma.todo.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        estimatedDuration: estimatedDuration || null,
      },
    });

    // fetch image from Pexels
    const imageData = await fetchImageFromPexels(title);
    if (imageData) {
      await prisma.todo.update({
        where: { id: todo.id },
        data: {
          imageUrl: imageData.url,
          imageAlt: imageData.alt,
        },
      });
    }

    // handle dependencies
    if (
      dependencies &&
      Array.isArray(dependencies) &&
      dependencies.length > 0
    ) {
      for (const depId of dependencies) {
        // check for circular dependencies
        const hasCircular = await hasCircularDependency(todo.id, depId);
        if (hasCircular) {
          return NextResponse.json(
            {
              error: `Circular dependency detected with task ${depId}`,
            },
            { status: 400 }
          );
        }

        await prisma.todoDependency.create({
          data: {
            todoId: todo.id,
            dependsOnId: depId,
          },
        });
      }
    }

    // fetch the created todo with relations
    const createdTodo = await prisma.todo.findUnique({
      where: { id: todo.id },
      include: {
        dependencies: {
          include: {
            dependsOn: true,
          },
        },
        dependents: {
          include: {
            todo: true,
          },
        },
      },
    });

    return NextResponse.json(createdTodo, { status: 201 });
  } catch (error) {
    console.error("Error creating todo:", error);
    return NextResponse.json({ error: "Error creating todo" }, { status: 500 });
  }
}
