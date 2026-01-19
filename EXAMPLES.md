# Usage Examples

Real-world examples of using RemoteAssistant to monitor your ML training.

## Scenario 1: Starting a Training Run

You've just kicked off a new training run and want to monitor it remotely.

```
You: /stats
Bot: 📊 System Stats:

🎮 GPU:
0, NVIDIA A100, 85%, 35123 MiB, 40960 MiB

💻 CPU Usage: 23.5%
🧠 Memory: 45G/128G

You: /processes python
Bot:
user  12345  85.2  35.1 python train.py --config config.yaml
user  12346   0.1   0.5 python -m tensorboard.main --logdir=./logs

You: Check if train.py is writing to the log file
Bot: [Executes] Yes, training.log was last modified 3 seconds ago and is actively being written to.

You: What's the current epoch and loss?
Bot: [Reads training.log] Currently on Epoch 15/100, Training Loss: 0.342, Validation Loss: 0.389
```

## Scenario 2: Debugging an Issue

Your training seems to have stalled.

```
You: Is my training still running?
Bot: [Checks processes] Yes, train.py (PID 12345) is still running, CPU: 85%, Memory: 35GB

You: But the GPU shows 0% usage. What's happening?
Bot: [Analyzes] The GPU utilization is at 0% which is unusual. Let me check the logs...

You: Show me the last 30 lines of the error log
Bot:
[ERROR] CUDA out of memory. Tried to allocate 2.5 GiB...
[ERROR] Training halted at step 15234

You: Kill the training process
Bot: [Executes] Process 12345 terminated successfully.
```

## Scenario 3: Checking Training Progress

Quick check during your commute.

```
You: How's the training going?
Bot: [Analyzes logs and checkpoints] Training is on Epoch 67/100. Loss has been decreasing steadily. Last checkpoint saved 5 minutes ago.

You: Show me a graph of the loss over time
Bot: [Reads tensorboard events] Here are the last 20 epochs:
Epoch 47: Loss 0.445
Epoch 48: Loss 0.438
Epoch 49: Loss 0.431
...
The trend shows consistent improvement.

You: When will it finish at this rate?
Bot: Based on the current pace of ~3 minutes per epoch, training should complete in approximately 1 hour 39 minutes.
```

## Scenario 4: Comparing Experiments

You're running multiple experiments and want to compare results.

```
You: List all checkpoint directories
Bot:
./checkpoints/experiment_baseline/
./checkpoints/experiment_lr_0.001/
./checkpoints/experiment_lr_0.0001/
./checkpoints/experiment_augmented/

You: Compare the validation loss of the latest checkpoint in each experiment
Bot: [Analyzes checkpoints]
- experiment_baseline: Val Loss 0.389 (Epoch 50)
- experiment_lr_0.001: Val Loss 0.412 (Epoch 50)
- experiment_lr_0.0001: Val Loss 0.367 (Epoch 50) ⭐ Best
- experiment_augmented: Val Loss 0.378 (Epoch 50)

You: Show me the tensorboard events for experiment_lr_0.0001
Bot: [Reads tensorboard] The experiment shows:
- Steady decrease in training loss
- Validation loss plateaued around epoch 45
- Best validation loss: 0.367 at epoch 48
```

## Scenario 5: System Monitoring

Making sure everything is healthy.

```
You: /stats
Bot: 📊 System Stats:

🎮 GPU:
0, RTX 3090, 98%, 23456 MiB, 24576 MiB

💻 CPU Usage: 67.8%
🧠 Memory: 89G/128G

You: The GPU memory is almost full. Is that a problem?
Bot: 98% GPU memory utilization is normal during training, especially with large batch sizes. However, the available 1.1GB headroom is minimal. If you plan to increase batch size, you might hit OOM errors.

You: Check disk space
Bot: [Executes df -h]
/dev/sda1  1.8T  1.6T  200G  89% /home

You: How large is my checkpoints directory?
Bot: [Executes du -sh] The checkpoints directory is 145GB

You: Delete checkpoints older than 7 days
Bot: [Executes find and rm] Removed 23 checkpoint files, freed 87GB of disk space.
```

## Scenario 6: Data Preparation

Monitoring a long-running data preprocessing job.

```
You: /processes data_prep
Bot:
user  67890  45.2  12.3 python data_prep.py --input raw/ --output processed/

You: How many files have been processed?
Bot: [Counts files] The processed/ directory contains 45,678 files out of an estimated 100,000 raw files. Approximately 45.7% complete.

You: Check the preprocessing log for errors
Bot: [Greps log] Found 23 warnings about corrupted images:
- raw/batch_12/img_00045.jpg: Invalid JPEG
- raw/batch_34/img_00123.jpg: Cannot identify image file
...
All corrupted files were skipped, processing continued.

You: How much disk space is the processed data using?
Bot: [Checks] processed/ directory: 567GB, raw/ directory: 1.2TB
```

## Scenario 7: Emergency Shutdown

You need to free up resources quickly.

```
You: I need to stop all Python training processes immediately
Bot: [Finds processes] Found 3 Python training processes. Terminate them?

You: Yes
Bot: [Executes pkill]
✅ Terminated PID 12345 (train.py)
✅ Terminated PID 12346 (train_model2.py)
✅ Terminated PID 12347 (finetune.py)

You: /stats
Bot: 📊 System Stats:

🎮 GPU:
0, NVIDIA A100, 0%, 256 MiB, 40960 MiB

💻 CPU Usage: 5.2%
🧠 Memory: 8G/128G

Resources freed successfully!
```

## Scenario 8: Model Evaluation

Checking evaluation results after training completes.

```
You: Did training finish?
Bot: [Checks] Yes! train.py completed 15 minutes ago. The final checkpoint was saved.

You: Show me the final metrics
Bot: [Reads final output]
Final Results (Epoch 100/100):
- Training Loss: 0.123
- Validation Loss: 0.156
- Test Accuracy: 94.7%
- F1 Score: 0.941

You: Compare this to the baseline experiment
Bot: [Compares results]
Current (experiment_augmented): Test Accuracy 94.7%
Baseline: Test Accuracy 91.2%

Improvement: +3.5 percentage points 🎉

You: Save these results to a report
Bot: [Creates markdown report] Report saved to results/experiment_augmented_report.md
```

## Tips for Effective Usage

### 1. Use Natural Language
Don't worry about exact commands. Ask questions naturally:
- ❌ "Execute tail -n 50 training.log"
- ✅ "Show me the last 50 lines of the training log"

### 2. Follow Up Questions
RemoteAssistant maintains context:
- "Show GPU stats" → "Is that normal?" → "How does it compare to yesterday?"

### 3. Combine Commands
Ask for multiple things at once:
- "Check if training is running and show me the latest loss values"

### 4. Use Quick Commands for Speed
- `/stats` - Faster than "Show me system stats"
- `/logs` - Direct access to log files

### 5. Be Specific When Needed
- ❌ "Show logs"
- ✅ "Show the last 100 lines of training.log"

### 6. Monitor Proactively
Set up regular check-ins:
- Morning: `/stats` to ensure overnight training progressed
- Midday: Check logs for any errors
- Evening: Compare results across experiments
