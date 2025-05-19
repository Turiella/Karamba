// src/ai/flows/summarize-topic.ts
'use server';

/**
 * @fileOverview Summarizes a given topic for a student in a specified language.
 *
 * - summarizeTopic - A function that summarizes a given topic.
 * - SummarizeTopicInput - The input type for the summarizeTopic function.
 * - SummarizeTopicOutput - The return type for the summarizeTopic function.
 */

import {ai} from '@/ai/genkit';
import {z} from 'genkit';

const SummarizeTopicInputSchema = z.object({
  topic: z.string().describe('The topic to summarize.'),
  details: z
    .string()
    .describe(
      'Detailed information about the topic to use for generating the summary.'
    ),
  language: z.string().describe('The language for the summary (e.g., "en" for English, "es" for Spanish).'),
});

export type SummarizeTopicInput = z.infer<typeof SummarizeTopicInputSchema>;

const SummarizeTopicOutputSchema = z.object({
  summary: z.string().describe('A concise summary of the topic in the requested language.'),
});

export type SummarizeTopicOutput = z.infer<typeof SummarizeTopicOutputSchema>;

export async function summarizeTopic(input: SummarizeTopicInput): Promise<SummarizeTopicOutput> {
  return summarizeTopicFlow(input);
}

const summarizeTopicPrompt = ai.definePrompt({
  name: 'summarizeTopicPrompt',
  input: {
    schema: SummarizeTopicInputSchema,
  },
  output: {
    schema: SummarizeTopicOutputSchema,
  },
  prompt: `You are an expert at creating concise summaries of complex topics for secondary students.

  Given the following topic and details, create a summary that captures the key concepts in a clear and understandable way.
  The summary MUST be in {{{language}}}.

  Topic: {{{topic}}}
  Details: {{{details}}}
  Summary:`,
});

const summarizeTopicFlow = ai.defineFlow(
  {
    name: 'summarizeTopicFlow',
    inputSchema: SummarizeTopicInputSchema,
    outputSchema: SummarizeTopicOutputSchema,
  },
  async input => {
    const {output} = await summarizeTopicPrompt(input);
    return output!;
  }
);
