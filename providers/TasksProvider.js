import React, { useContext, useState, useEffect, useRef } from "react";
import Realm from "realm";
import { Task } from "../schemas";
import { useAuth } from "./AuthProvider";

const TasksContext = React.createContext(null);

const TasksProvider = ({ children, projectPartition }) => {
  const [tasks, setTasks] = useState([]);
  const { user } = useAuth();

  // Use a Ref to store the realm rather than the state because it is not
  // directly rendered, so updating it should not trigger a re-render as using
  // state would.
  const realmRef = useRef(null);

  useEffect(() => {
    // Enables offline-first: opens a local realm immediately without waiting 
    // for the download of a synchronized realm to be completed.
    const OpenRealmBehaviorConfiguration = {
      type: 'openImmediately',
    };
    const config = {
      schema: [Task.schema],
      sync: {
        user: user,
        partitionValue: projectPartition,
        newRealmFileBehavior: OpenRealmBehaviorConfiguration,
        existingRealmFileBehavior: OpenRealmBehaviorConfiguration,
      },
    };
    // TODO: Open the project realm with the given configuration and store
    // it in the realmRef. Once opened, fetch the Task objects in the realm,
    // sorted by name, and attach a listener to the Task collection. When the
    // listener fires, use the setTasks() function to apply the updated Tasks
    // list to the state.
    Realm.open(config).then((userRealm) => {
      realmRef.current = userRealm;
      const users = userRealm.objects("User");
      users.addListener(() => {
        // The user custom data object may not have been loaded on
        // the server side yet when a user is first registered.
        if (users.length === 0) {
          setProjectData([myProject]);
        } else {
          const { memberOf } = users[0];
          setProjectData([...memberOf]);
        }
      });
    });

    return () => {
      // cleanup function
      const projectRealm = realmRef.current;
      if (projectRealm) {
        // TODO: close the project realm and reset the realmRef's
        // current value to null.
        projectRealm.close();
    realmRef.current = null;
        setTasks([]);
      }
    };
  }, [user, projectPartition]);

  const createTask = (newTaskName) => {
    // TODO: Create the Task in a write block.
    const projectRealm = realmRef.current;
  projectRealm.write(() => {
    // Create a new task in the same partition -- that is, in the same project.
    projectRealm.create(
      "Task",
      new Task({
        name: newTaskName || "New Task",
        partition: projectPartition,
      })
    );
  });
  };

  const setTaskStatus = (task, status) => {
    // One advantage of centralizing the realm functionality in this provider is
    // that we can check to make sure a valid status was passed in here.
    if (
      ![
        Task.STATUS_OPEN,
        Task.STATUS_IN_PROGRESS,
        Task.STATUS_COMPLETE,
      ].includes(status)
    ) {
      throw new Error(`Invalid status: ${status}`);
    }
    const projectRealm = realmRef.current;
    projectRealm.write(() => {
      task.status = status;
    });

    // TODO: In a write block, update the Task's status.
  };

  // Define the function for deleting a task.
  const deleteTask = (task) => {
    const projectRealm = realmRef.current;
    // TODO: In a write block, delete the Task.
    projectRealm.write(() => {
      projectRealm.delete(task);
      setTasks([...projectRealm.objects("Task").sorted("name")]);
    });
  };

  // Render the children within the TaskContext's provider. The value contains
  // everything that should be made available to descendants that use the
  // useTasks hook.
  return (
    <TasksContext.Provider
      value={{
        createTask,
        deleteTask,
        setTaskStatus,
        tasks,
      }}
    >
      {children}
    </TasksContext.Provider>
  );
};

// The useTasks hook can be used by any descendant of the TasksProvider. It
// provides the tasks of the TasksProvider's project and various functions to
// create, update, and delete the tasks in that project.
const useTasks = () => {
  const task = useContext(TasksContext);
  if (task == null) {
    throw new Error("useTasks() called outside of a TasksProvider?"); // an alert is not placed because this is an error for the developer not the user
  }
  return task;
};

export { TasksProvider, useTasks };
