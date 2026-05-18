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

            // 2. Enable CORS in the HTTP pipeline (Must be placed before UseAuthorization)
            app.UseCors("AllowViteApp");

            app.UseHttpsRedirection();

            app.UseAuthorization();

            app.MapControllers();

            app.Run();
        }
    }
}
