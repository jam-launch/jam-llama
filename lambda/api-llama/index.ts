import { APIGatewayProxyHandler } from 'aws-lambda';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient();

export const handler: APIGatewayProxyHandler = async (event) => {
    try {
        const body = JSON.parse(event.body || '{}');
        const prompt = body.prompt || '';
        const system = body.system || 'You are a helpful AI assistant';
        const temperature = body.temperature || 0.5;
        const top_p = body.top_p || 0.9;
        const max_gen_len = body.max_gen_length || 1024;

        if (!prompt) {
            return {
                statusCode: 400,
                body: JSON.stringify({ message: 'Input text is required' }),
            };
        }

        let fullPrompt = `<|begin_of_text|><|start_header_id|>system<|end_header_id|>\n\n${system}<|eot_id|>\n`
        fullPrompt += `<|start_header_id|>user<|end_header_id|>\n\n${prompt}<|eot_id|><|start_header_id|>assistant<|end_header_id|>`

        const command = new InvokeModelCommand({
            modelId: "meta.llama3-8b-instruct-v1:0",
            contentType: 'application/json',
            accept: 'application/json',
            body: JSON.stringify({
                prompt: fullPrompt,
                temperature,
                top_p,
                max_gen_len
            }),
        });

        const response = await client.send(command);
        const modelResponse = JSON.parse(response.body.transformToString() || '{}');

        return {
            statusCode: 200,
            body: JSON.stringify({
                message: 'Success',
                result: modelResponse,
            }),
        };
    } catch (error) {
        console.error('Error invoking Bedrock model:', error);
        return {
            statusCode: 500,
            body: JSON.stringify({ message: 'Failed to invoke the model', error }),
        };
    }
};