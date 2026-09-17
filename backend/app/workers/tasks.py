from app.agents.runner import run_agent_pipeline
from app.workers.celery_app import celery_app


@celery_app.task(name="nexusflow.execute_agent_run")
def execute_agent_run(run_id: str) -> str:
    run_agent_pipeline(run_id)
    return run_id
