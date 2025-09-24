# Deployment Guide - Autodark

## Easypanel Deployment

### Prerequisites
- Easypanel instance
- GitHub repository
- Environment variables configured

### Deployment Steps

1. **Fork/Clone the repository** to your GitHub account

2. **Configure environment variables** in Easypanel:
   ```
   VITE_SUPABASE_URL=your-supabase-url
   VITE_SUPABASE_ANON_KEY=your-supabase-anon-key
   VITE_API_BASE_URL=your-api-base-url
   VITE_YOUTUBE_API_KEY=your-youtube-api-key
   ```

3. **Import the application** in Easypanel:
   - Use the `easypanel.yml` configuration file
   - Set your GitHub repository URL
   - Configure your custom domain

4. **Deploy**: Easypanel will automatically build and deploy using the Dockerfile

### Docker Deployment (Alternative)

```bash
# Build the image
docker build -t autodark .

# Run with environment variables
docker run -p 80:80 \
  -e VITE_SUPABASE_URL=your-supabase-url \
  -e VITE_SUPABASE_ANON_KEY=your-supabase-anon-key \
  -e VITE_API_BASE_URL=your-api-base-url \
  -e VITE_YOUTUBE_API_KEY=your-youtube-api-key \
  autodark
```

### Using Docker Compose

```bash
# Create .env file with your variables
cp .env.example .env
# Edit .env with your actual values

# Deploy
docker-compose up -d
```

### Important Notes
- Ensure Supabase Edge Functions are deployed
- Configure CORS settings in Supabase for your domain
- The application uses nginx for serving static files
- Health check endpoint available at `/health`

### Troubleshooting
- Check container logs: `docker logs <container-id>`
- Verify environment variables are properly set
- Ensure Supabase configuration is correct
- Check nginx configuration in `nginx.conf`