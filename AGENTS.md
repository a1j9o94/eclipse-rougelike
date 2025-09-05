Always make sure to follow test driven development and write failing tests before making changes and then write tests before making changes. Run linters and formatters to make sure your code is clean. Finally run a build.

Make sure to always consider the actual player experience outcomes we are aiming for and make sure your fixes reflect thoughtful design choices and a focus on making the game fun and easy to understand.

For major projects start a new branch and create a new plan. Use the codeing_agents folder to save information and maintain a consistent point of view on what you're building, what success looks like, how the code is architected, etc. By default you should use the branch your parent agent is on. Bias towards writing and saving context as much as possible.

In general you should never have any unknown or any types. You should always use the types of the system and creat specific interfaces for data tthat we're transmitting if it doesn't fit in our existing schema.

If you are developing a plan reference coding_agents/planning_agents.md

If you are doing research, reference coding_agents/research_agents.md

If you are doing implementation, reference coding_agents/implementation_agents.md