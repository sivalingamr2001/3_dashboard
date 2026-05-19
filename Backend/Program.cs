using Backend.DB;
using Backend.Interfaces;
using Backend.Services;

namespace Backend
{
    public class Program
    {
        public static void Main(string[] args)
        {
            var builder = WebApplication.CreateBuilder(args);

            // Add services to the container.

            builder.Services.AddControllers();
            // Learn more about configuring Swagger/OpenAPI at https://aka.ms/aspnetcore/swashbuckle
            builder.Services.AddEndpointsApiExplorer();
            builder.Services.AddSwaggerGen();

            // 1. Define and add the CORS policy
            builder.Services.AddCors(options =>
            {
                options.AddPolicy("AllowViteApp", policy =>
                {
                    policy.WithOrigins("http://localhost:3000") // Remove the trailing slash here
                          .AllowAnyHeader()
                          .AllowAnyMethod();
                });
            });

            // Register the infrastructure DB service
            builder.Services.AddSingleton<IOracleService, OracleService>();

            // Register the domain repository service
            builder.Services.AddScoped<IOuSalesRepository, OuSalesRepository>();

            var app = builder.Build();

            // Configure the HTTP request pipeline.
            if (app.Environment.IsDevelopment())
            {
                app.UseSwagger();
                app.UseSwaggerUI();
            }

            app.UseCors("AllowViteApp");
            app.UseHttpsRedirection();

            // 3. Static Files (Serves your built frontend)
            app.UseDefaultFiles();
            app.UseStaticFiles();

            // 4. Auth and Routing (Always after CORS and static files)
            app.UseAuthorization();

            // 5. Endpoints
            app.MapControllers();
            app.MapFallbackToFile("index.html");

            app.Run();
        }
    }
}
