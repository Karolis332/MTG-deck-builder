path = 'app/routers/health.py'
with open(path) as f:
    s = f.read()
orig = s

old_import = 'from app.workers.nightly_pipeline import run_pipeline, get_pipeline_status\n'
new_import = 'from app.workers.nightly_pipeline import run_pipeline, get_pipeline_status, pipeline_lock_held_elsewhere\n'
assert old_import in s
s = s.replace(old_import, new_import, 1)

old = '''@router.post("/admin/trigger-pipeline")
async def trigger_pipeline(request: Request):
    """Kick off the nightly pipeline as a background task.

    Protected by API key middleware. Returns immediately with task ID.
    """
    status = get_pipeline_status()
    if status["running"]:
        return {"status": "already_running", "message": "Pipeline is already in progress"}

    task_id = str(uuid.uuid4())[:8]

    async def _run_pipeline():
        try:
            await run_pipeline()
'''
new = '''@router.post("/admin/trigger-pipeline")
async def trigger_pipeline(request: Request, response: Response, force: bool = False):
    """Kick off the nightly pipeline as a background task.

    Protected by API key middleware. Returns immediately with task ID.

    Refuses with 409 while a pipeline/retrain is already active — checked via
    a Postgres advisory lock (see nightly_pipeline.PIPELINE_LOCK_KEY), which
    is visible across containers, unlike the in-process _pipeline_running
    flag this used to check alone (duplicate trainings on 2026-09-02 and
    2026-09-12: the admin endpoint and the standalone daemon container each
    have their own process memory). Pass ?force=true to override.
    """
    status = get_pipeline_status()
    if status["running"]:
        response.status_code = 409
        return {"status": "already_running", "message": "Pipeline is already in progress in this process"}

    if not force and await pipeline_lock_held_elsewhere():
        response.status_code = 409
        return {
            "status": "already_running",
            "message": "Pipeline/retrain is active in another process — pass ?force=true to override",
        }

    task_id = str(uuid.uuid4())[:8]

    async def _run_pipeline():
        try:
            await run_pipeline(force=force)
'''
assert old in s, 'admin endpoint block not found'
s = s.replace(old, new, 1)

old_response_import = 'from fastapi import APIRouter, Depends, Request\n'
new_response_import = 'from fastapi import APIRouter, Depends, Request, Response\n'
assert old_response_import in s
s = s.replace(old_response_import, new_response_import, 1)

assert s != orig
with open(path, 'w') as f:
    f.write(s)
print('patched OK')
