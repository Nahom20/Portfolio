const AWS = require('aws-sdk');

AWS.config.update({ region: 'us-east-1' });

const dynamoDb = new AWS.DynamoDB.DocumentClient();
const sns = new AWS.SNS();

const TABLE_NAME = 'Messages';
const SNS_TOPIC_ARN = 'arn:aws:sns:us-east-1:009160033078:Messagenotification'; 

exports.handler = async (event) => {
    const method = event.httpMethod;
    const email = event.queryStringParameters ? event.queryStringParameters.email : null;
    const body = event.body ? JSON.parse(event.body) : null;

    switch (method) {
        case 'POST':
            return createMessage(body);
        case 'GET':
            return getMessage(email);
        case 'PUT':
            return updateMessage(email, body);
        case 'DELETE':
            return deleteMessage(email);
        default:
            return {
                statusCode: 405,
                body: JSON.stringify({ error: `Method ${method} not allowed` })
            };
    }
};

// Create (POST)
const createMessage = async (body) => {
    const { email, subject, message } = body;

    if (!email || !message) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email and message are required' })
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Item: {
            email: email,
            timestamp: new Date().toISOString(),
            subject: subject,
            message: message
        }
    };

    try {
        await dynamoDb.put(params).promise();
        
        
        const snsParams = {
            TopicArn: SNS_TOPIC_ARN,
            Message: JSON.stringify({
                email: email,
                subject: subject,
                message: message
            }),
            Subject: 'New Message Created'
        };
        
        await sns.publish(snsParams).promise();

        return {
            statusCode: 200,
            body: JSON.stringify({ success: 'Message created and notification sent successfully!' })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not create message' })
        };
    }
};

// Read (GET)
const getMessage = async (email) => {
    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email is required' })
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            email: email
        }
    };

    try {
        const result = await dynamoDb.get(params).promise();
        if (result.Item) {
            return {
                statusCode: 200,
                body: JSON.stringify(result.Item)
            };
        } else {
            return {
                statusCode: 404,
                body: JSON.stringify({ error: 'Message not found' })
            };
        }
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not retrieve message' })
        };
    }
};

// Update (PUT)
const updateMessage = async (email, body) => {
    if (!email || !body.message) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email and message are required' })
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            email: email
        },
        UpdateExpression: 'set message = :message, subject = :subject',
        ExpressionAttributeValues: {
            ':message': body.message,
            ':subject': body.subject
        },
        ReturnValues: 'UPDATED_NEW'
    };

    try {
        const result = await dynamoDb.update(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ success: 'Message updated successfully!', updatedAttributes: result.Attributes })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not update message' })
        };
    }
};

// Delete (DELETE)
const deleteMessage = async (email) => {
    if (!email) {
        return {
            statusCode: 400,
            body: JSON.stringify({ error: 'Email is required' })
        };
    }

    const params = {
        TableName: TABLE_NAME,
        Key: {
            email: email
        }
    };

    try {
        await dynamoDb.delete(params).promise();
        return {
            statusCode: 200,
            body: JSON.stringify({ success: 'Message deleted successfully!' })
        };
    } catch (error) {
        console.error(error);
        return {
            statusCode: 500,
            body: JSON.stringify({ error: 'Could not delete message' })
        };
    }
};
