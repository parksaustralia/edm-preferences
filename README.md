# EDM preferences form

A form that loads the EDM preferences for a given contact from SendGrid, allowing them to opt in or out of additional mailing lists.

This project is set up and deployed using [AWS CDK](https://docs.aws.amazon.com/cdk/).

## Development

This project requires [Node.js 12.x](https://nodejs.org/en/download/releases/) and that you have [AWS credentials](https://docs.aws.amazon.com/cli/latest/userguide/cli-configure-files.html) configured in order to deploy.

- `npm install`
- `npm run test`
- `npm run debug`

The project includes a Github Codespaces config that will create an environment with all of the require dependencies installed. All that is required after creating the codespace is to run `aws configure` and enter your AWS API keys and region.

You may also like to set your SendGrid API key for local development and debugging:

`export SENDGRID_VISITORS_API_KEY="SG.<snip>"`

## Deployment

First the [SendGrid API key](#sendgrid-api-key) must be set in the account using AWS secrets manager.

Then you can deploy the stack with:

```
npm run cdk deploy
```

## SendGrid API keys

The SendGrid API keys are stored in AWS Secrets Manager and is pulled when deploying the application.

To set the keys:

```
aws secretsmanager create-secret --name sendgrid/visitorsApiKey --description "SendGrid visitors account API key" --secret-string "<key>"

aws secretsmanager create-secret --name sendgrid/mediaApiKey --description "SendGrid media account API key" --secret-string "<key>"

aws secretsmanager create-secret --name sendgrid/industryApiKey --description "SendGrid industry account API key" --secret-string "<key>"
```

To change the key, the secret needs to first be updated and then the CDK stack redeployed:

```
aws secretsmanager update-secret --name sendgrid/visitorsApiKey --description "SendGrid visitors account API key" --secret-string "<key>"

aws secretsmanager update-secret --name sendgrid/mediaApiKey --description "SendGrid media account API key" --secret-string "<key>"

aws secretsmanager update-secret --name sendgrid/industryApiKey --description "SendGrid industry account API key" --secret-string "<key>"
```
