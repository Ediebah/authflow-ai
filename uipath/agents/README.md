# CriteriaMatch Agent

The deployable coded agent lives at `../../criteriamatch-agent/` (a native UiPath
coded agent built with uipath-langchain, published to the Orchestrator Tenant
Processes Feed and invoked by the Maestro process).

Key files in criteriamatch-agent/:
- main.py            graph entry point (UiPathAzureChatOpenAI via LLM Gateway)
- criteriamatch/     schema, prompts, deterministic routing
- input_case*.json   the three validated test cases
