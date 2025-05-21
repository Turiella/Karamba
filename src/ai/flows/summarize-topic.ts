
// src/ai/flows/summarize-topic.ts
'use server';

/**
 * @fileOverview Summarizes a given topic for a student in a specified language,
 * adhering to specific length and detail constraints.
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
  summary: z.string().describe('A structured summary of the topic in the requested language, following specific length and detail rules.'),
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
  prompt: `Eres un experto en crear resúmenes concisos y estructurados para estudiantes de secundaria.
Dado el siguiente tema y detalles, genera un resumen que se adhiera a estas reglas estrictas:

1.  **Idioma de Salida:** El resumen DEBE estar en {{{language}}}.
2.  **Longitud y Detalle - Tema Amplio:**
    *   Si el 'tema' proporcionado es amplio y general (ejemplo: "Segunda Guerra Mundial", "Fotosíntesis") Y el campo 'detalles' está vacío o es muy genérico, el resumen DEBE constar de exactamente 10 renglones.
    *   Este resumen de 10 renglones debe cubrir solo los aspectos clave más cruciales del tema amplio, sin entrar en detalles extensos sobre ningún subtema individual.
3.  **Longitud y Detalle - Tema Específico o Entrada Detallada:**
    *   Si el 'tema' proporcionado es más específico (ejemplo: "Desembarco de Normandía", "Ciclo de Calvin en la fotosíntesis") O si el campo 'detalles' contiene información o preguntas específicas, el resumen DEBE constar de exactamente 10 renglones.
    *   Este resumen de 10 renglones debe centrarse en proporcionar información detallada relevante para el tema específico o los detalles proporcionados.
4.  **Longitud Máxima Absoluta:** BAJO NINGUNA CIRCUNSTANCIA el resumen debe exceder los 15 renglones.
5.  **Enfoque del Contenido:** El resumen debe ser claro, informativo y basarse ÚNICAMENTE en la información implícita o declarada directamente por el 'tema' y los 'detalles' del usuario. No introduzcas conocimiento externo o información no solicitada por el usuario.

Tema: {{{topic}}}
Detalles: {{{details}}}

Resumen:`,
  config: {
    safetySettings: [
      {
        category: 'HARM_CATEGORY_DANGEROUS_CONTENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HATE_SPEECH',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_HARASSMENT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
      {
        category: 'HARM_CATEGORY_SEXUALLY_EXPLICIT',
        threshold: 'BLOCK_MEDIUM_AND_ABOVE',
      },
    ],
  },
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
