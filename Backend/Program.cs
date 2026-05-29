using Backend.DB;
using Backend.Interfaces;
using Backend.Services;
using Backend.OuDashboard.Configuration;
using Backend.OuDashboard.Data;
using Backend.OuDashboard.Services;
using Backend.OuDashboard.Workers;
using Serilog;

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

            // ── Serilog logging from appsettings.json
            builder.Services.AddSerilog((services, lc) => lc
                .ReadFrom.Configuration(builder.Configuration)
                .ReadFrom.Services(services));

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

            // ── OU Dashboard Migration Configuration
            builder.Services.Configure<MigrationSettings>(
                builder.Configuration.GetSection("MigrationSettings"));

            // ── OU Dashboard Data Factories (Singleton — stateless)
            builder.Services.AddSingleton<OracleConnectionFactory>();
            builder.Services.AddSingleton<SqlServerConnectionFactory>();

            // ── OU Dashboard Migration Service (Scoped — fresh per request)
            builder.Services.AddScoped<IMigrationService, DashboardMigrationService>();

            // ── OU Dashboard Background Worker (runs daily at scheduled time)
            builder.Services.AddHostedService<OuDashboardWorker>();

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
