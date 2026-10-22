const taskEvents = require('./events');

// Listener for task-created event
taskEvents.on('task-created', (data) => {
  try {
    const { task, user } = data;
    console.log(`[Notification] 'task-created' event received at ${new Date().toISOString()}`);

    // Simulate slow background task (e.g., sending email/notification) with 2s delay
    setTimeout(() => {
      console.log(
        `[Notification - Background Completed] Task "${task.title}" (ID: ${task._id}) created successfully at ${new Date().toISOString()} | Assigned User: ${user?.email || user?.id || task.userId}`
      );
    }, 2000);
  } catch (err) {
    taskEvents.emit('error', err);
  }
});

// Supplementary: Listener for task-deleted event
taskEvents.on('task-deleted', (data) => {
  try {
    const { task, user } = data;
    console.log(`[Notification] 'task-deleted' event received at ${new Date().toISOString()}`);

    setTimeout(() => {
      console.log(
        `[Notification - Background Completed] Task "${task.title}" (ID: ${task._id}) deleted at ${new Date().toISOString()} | User: ${user?.email || user?.id || task.userId}`
      );
    }, 2000);
  } catch (err) {
    taskEvents.emit('error', err);
  }
});

// Supplementary: Error listener to catch errors without crashing the server
taskEvents.on('error', (err) => {
  console.error(`[Event Error] Error in task event handler: ${err.message}`);
});

module.exports = taskEvents;
