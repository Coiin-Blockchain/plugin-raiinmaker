import { TaskWithVotes } from '../types';

export function formatTaskStatus(task: TaskWithVotes): string {
  const { id, name, status, question, subject, votes, consensusVotes, answer } = task;
  
  // Format header with emoji indicators based on status
  let statusEmoji = '⏳';
  if (status === 'completed') {
    statusEmoji = answer === 'true' ? '✅' : '❌';
  }
  
  let header = `${statusEmoji} ${name} (ID: ${id.substring(0, 8)}...)`;
  
  // Format status message
  let statusMessage = '';
  if (status === 'completed' && answer) {
    statusMessage = `The verification is complete! The content was ${answer === 'true' ? 'approved ✓' : 'rejected ✗'}.`;
  } else if (status === 'pending') {
    statusMessage = `The verification is still in progress. ${votes.length} of ${consensusVotes} required votes collected.`;
  } else {
    statusMessage = `Status: ${status}`;
  }
  
  // Format vote information if available
  let voteInfo = '';
  if (votes && votes.length > 0) {
    const yesVotes = votes.filter(v => v.answer === 'true').length;
    const noVotes = votes.filter(v => v.answer === 'false').length;
    
    // Create simple ASCII bar chart
    const total = Math.max(consensusVotes, votes.length);
    const yesBar = '█'.repeat(Math.floor((yesVotes / total) * 10));
    const noBar = '█'.repeat(Math.floor((noVotes / total) * 10));
    
    voteInfo = `
Votes:
✓ Approve: ${yesVotes} ${yesBar}
✗ Reject: ${noVotes} ${noBar}
`;
  }
  
  // Assemble the complete formatted output
  return `
${header}
${'-'.repeat(header.length)}
Question: "${question}"
Content: "${subject}"
${statusMessage}
${voteInfo}
`;
}